"use client";

import { useState, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { X, Upload, Loader2, Globe, Send } from "lucide-react";

interface EditProfileModalProps {
  currentDisplayName?: string;
  currentAvatarUrl?: string;
  currentXUrl?: string;
  currentWebsiteUrl?: string;
  currentTelegramUrl?: string;
  walletAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProfileModal({
  currentDisplayName = "",
  currentAvatarUrl,
  currentXUrl = "",
  currentWebsiteUrl = "",
  currentTelegramUrl = "",
  walletAddress,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const { isConnected, address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Always use the checksummed address from wagmi (not the URL param which may be lowercase)
  const signerAddress = connectedAddress ?? walletAddress;

  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentAvatarUrl ?? null
  );
  const [xUrl, setXUrl] = useState(currentXUrl);
  const [websiteUrl, setWebsiteUrl] = useState(currentWebsiteUrl);
  const [telegramUrl, setTelegramUrl] = useState(currentTelegramUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  }

  // Whether the user has actually changed anything
  const nameChanged = displayName.trim() !== (currentDisplayName ?? "").trim();
  const avatarChanged = avatarFile !== null;
  const xUrlChanged = xUrl.trim() !== (currentXUrl ?? "").trim();
  const websiteUrlChanged = websiteUrl.trim() !== (currentWebsiteUrl ?? "").trim();
  const telegramUrlChanged =
    telegramUrl.trim() !== (currentTelegramUrl ?? "").trim();
  const hasChanges =
    nameChanged ||
    avatarChanged ||
    xUrlChanged ||
    websiteUrlChanged ||
    telegramUrlChanged;

  async function handleSubmit() {
    if (!isConnected || !connectedAddress) {
      setError("Please connect your wallet");
      return;
    }
    if (!hasChanges) {
      setError("No changes to save");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build the message to sign — proves wallet ownership
      const message = `Update Lickfun.xyz profile\nWallet: ${signerAddress}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      // Payload — only include fields that actually changed
      const payload: Record<string, string> = {
        walletAddress: signerAddress,
        signature,
        message,
      };

      if (avatarChanged && avatarFile) {
        // Upload new avatar to Storj
        const uploadForm = new FormData();
        uploadForm.append("avatar", avatarFile);
        uploadForm.append("walletAddress", signerAddress);
        uploadForm.append("signature", signature);
        uploadForm.append("message", message);

        const uploadRes = await fetch("/api/upload-profile", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed");
        }

        const uploadData = await uploadRes.json();
        payload.avatarUri = uploadData.avatarUri;
      }

      if (nameChanged) {
        payload.displayName = displayName.trim();
      }

      if (xUrlChanged) {
        payload.xUrl = xUrl.trim();
      }

      if (websiteUrlChanged) {
        payload.websiteUrl = websiteUrl.trim();
      }

      if (telegramUrlChanged) {
        payload.telegramUrl = telegramUrl.trim();
      }

      // Register the profile metadata (merges with existing)
      const registerRes = await fetch("/api/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!registerRes.ok) {
        const err = await registerRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Registration failed");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("[EditProfileModal]", err instanceof Error ? err.message : err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-card border border-figma-card bg-figma-card p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-figma-muted hover:text-figma-white transition-colors"
          disabled={loading}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="text-figma-xl text-figma-white font-bold mb-1">
          Edit Profile
        </h2>
        <p className="text-figma-sm text-figma-muted mb-6">
          Update your display name, avatar, and social links — changes are saved independently.
        </p>

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div
            className="w-24 h-24 rounded-full overflow-hidden bg-figma-purple flex items-center justify-center text-white font-bold text-2xl cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              walletAddress.slice(2, 4).toUpperCase()
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-figma-sm text-figma-green hover:text-figma-green-soft transition-colors"
            disabled={loading}
          >
            <Upload size={14} />
            {avatarPreview ? "Change image" : "Upload image"}
          </button>
        </div>

        {/* Display name */}
        <div className="mb-4">
          <label className="block text-figma-sm text-figma-muted mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            maxLength={32}
            className="w-full px-3 py-2 rounded-pill bg-figma-surface border border-figma-card-alt text-figma-white text-figma-sm outline-none focus:border-figma-green transition-colors"
            disabled={loading}
          />
          <span className="text-figma-xs text-figma-muted mt-1 block">
            {displayName.length}/32
          </span>
        </div>

        {/* Social Links */}
        <div className="mb-4">
          <label className="block text-figma-sm text-figma-muted mb-2">
            Social Links
          </label>
          <div className="flex flex-col gap-2">
            {/* X (Twitter) */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-pill bg-figma-surface border border-figma-card-alt focus-within:border-figma-green transition-colors">
              <span className="text-figma-white font-bold text-figma-sm w-4 text-center shrink-0">
                𝕏
              </span>
              <input
                type="url"
                value={xUrl}
                onChange={(e) => setXUrl(e.target.value)}
                placeholder="https://x.com/yourhandle"
                className="flex-1 bg-transparent text-figma-white text-figma-sm outline-none placeholder:text-figma-muted"
                disabled={loading}
              />
            </div>
            {/* Website */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-pill bg-figma-surface border border-figma-card-alt focus-within:border-figma-green transition-colors">
              <Globe size={14} className="text-figma-muted shrink-0" />
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="flex-1 bg-transparent text-figma-white text-figma-sm outline-none placeholder:text-figma-muted"
                disabled={loading}
              />
            </div>
            {/* Telegram */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-pill bg-figma-surface border border-figma-card-alt focus-within:border-figma-green transition-colors">
              <Send size={14} className="text-figma-muted shrink-0" />
              <input
                type="url"
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                placeholder="https://t.me/yourhandle"
                className="flex-1 bg-transparent text-figma-white text-figma-sm outline-none placeholder:text-figma-muted"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-pill bg-red-500/10 border border-red-500/20 text-red-400 text-figma-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !isConnected || !hasChanges}
          className="w-full flex items-center justify-center gap-2 h-[42px] rounded-pill bg-figma-green text-figma-bg font-semibold transition-colors hover:bg-figma-green-soft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>

        {!isConnected && (
          <p className="text-figma-xs text-figma-muted text-center mt-3">
            Connect your wallet to edit your profile
          </p>
        )}
      </div>
    </div>
  );
}