"use client";

import { useState, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { X, Upload, Loader2 } from "lucide-react";

interface EditProfileModalProps {
  currentDisplayName?: string;
  currentAvatarUrl?: string;
  walletAddress: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditProfileModal({
  currentDisplayName = "",
  currentAvatarUrl,
  walletAddress,
  onClose,
  onSuccess,
}: EditProfileModalProps) {
  const { isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentAvatarUrl ?? null
  );
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

  async function handleSubmit() {
    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    if (!avatarFile && !currentAvatarUrl) {
      setError("Please select an avatar image");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build the message to sign — proves wallet ownership
      const message = `Update Lick.fun profile\nWallet: ${walletAddress}\nName: ${displayName.trim()}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      let avatarUri: string;

      if (avatarFile) {
        // Upload new avatar + metadata to IPFS
        const uploadForm = new FormData();
        uploadForm.append("avatar", avatarFile);
        uploadForm.append("walletAddress", walletAddress);
        uploadForm.append("displayName", displayName.trim());
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
        avatarUri = uploadData.avatarUri;
      } else {
        // Keep existing avatar — re-register with current URI
        // (We don't have the raw URI here, so we re-fetch it)
        const existing = await fetch(`/api/profile-image/${walletAddress.toLowerCase()}`);
        if (!existing.ok) throw new Error("Existing avatar not found");
        const existingData = await existing.json();
        avatarUri = existingData.avatarUri;
      }

      // Register the profile metadata
      const registerRes = await fetch("/api/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          displayName: displayName.trim(),
          avatarUri,
          signature,
          message,
        }),
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
          Set a custom display name and avatar for your profile.
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

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-pill bg-red-500/10 border border-red-500/20 text-red-400 text-figma-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !isConnected}
          className="w-full flex items-center justify-center gap-2 h-[42px] rounded-pill bg-figma-green text-figma-bg font-semibold transition-colors hover:bg-figma-green-soft disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            "Save Profile"
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