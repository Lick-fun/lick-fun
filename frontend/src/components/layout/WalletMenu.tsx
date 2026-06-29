"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import {
  Check,
  Copy,
  ExternalLink,
  LogOut,
  Plus,
  User,
} from "lucide-react";
import { useProfileMeta } from "@/lib/hooks/useProfileMeta";
import { cn } from "@/lib/utils";

/**
 * Custom wallet dropdown that replaces the default RainbowKit <ConnectButton>.
 *
 * Trigger button shows the user's profile avatar + display name (from the
 * off-chain profile store via useProfileMeta). When clicked, opens a dropdown
 * with: Profile, Create Token, Copy Address, View on Explorer, Disconnect.
 *
 * The trigger and dropdown header update reactively as useProfileMeta resolves
 * (react-query caches by address).
 *
 * Disconnected state falls back to the standard "Connect" button which opens
 * the RainbowKit connect modal — same UX as the default <ConnectButton>.
 */
export function WalletMenu() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!account && !!chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-figma-surface hover:bg-figma-surface/80 text-sm font-medium transition-colors text-figma-white"
            >
              {!ready ? "" : "Connect"}
            </button>
          );
        }

        return (
          <ConnectedMenu
            address={account.address}
            ensName={account.ensName}
            displayName={account.displayName}
            openAccountModal={openAccountModal}
          />
        );
      }}
    </ConnectButton.Custom>
  );
}

interface ConnectedMenuProps {
  address: string;
  ensName?: string;
  displayName: string;
  openAccountModal: () => void;
}

function ConnectedMenu({
  address,
  ensName,
  displayName,
  openAccountModal,
}: ConnectedMenuProps) {
  const router = useRouter();
  const { disconnect } = useDisconnect();
  const { data: profileMeta } = useProfileMeta(address);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Reset "Copied!" feedback after 2s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Display name priority: custom profile name > ENS > truncated address
  const customName = profileMeta?.displayName?.trim();
  const triggerName =
    customName || (ensName ? ensName : `${address.slice(0, 6)}…${address.slice(-4)}`);
  const headerName = customName || ensName || triggerName;
  const avatarUrl = profileMeta?.avatarUrl;
  const initials = address.slice(2, 4).toUpperCase();

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
  }

  function handleProfile(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    router.push(`/profile/${address.toLowerCase()}`);
  }

  function handleCreate(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    router.push("/create");
  }

  function handleExplorer(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    window.open(`https://monadexplorer.com/address/${address}`, "_blank", "noopener,noreferrer");
  }

  function handleDisconnect(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    disconnect();
  }

  function handleAccountModal(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen(false);
    openAccountModal();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button — avatar + name */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors",
          open
            ? "border-figma-green bg-figma-surface"
            : "border-figma-surface bg-figma-card hover:bg-figma-surface"
        )}
      >
        <span
          className="inline-flex items-center justify-center shrink-0 overflow-hidden bg-figma-purple text-white font-bold rounded-full"
          style={{ width: 28, height: 28, fontSize: 11, lineHeight: 1 }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={headerName}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="text-figma-white text-sm font-medium max-w-[140px] truncate hidden sm:inline">
          {triggerName}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-card border border-figma-surface bg-figma-card shadow-2xl overflow-hidden z-50"
        >
          {/* Header — avatar + name + address */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-figma-surface">
            <span
              className="inline-flex items-center justify-center shrink-0 overflow-hidden bg-figma-purple text-white font-bold rounded-full"
              style={{ width: 36, height: 36, fontSize: 13, lineHeight: 1 }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={headerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-figma-white text-sm font-bold truncate">
                {headerName}
              </span>
              <span className="text-figma-muted text-xs truncate">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="flex flex-col py-1">
            <MenuItem
              icon={<User className="w-4 h-4" />}
              label="Profile"
              onClick={handleProfile}
            />
            <MenuItem
              icon={<Plus className="w-4 h-4" />}
              label="Create Token"
              onClick={handleCreate}
            />
            <MenuItem
              icon={copied ? <Check className="w-4 h-4 text-figma-green" /> : <Copy className="w-4 h-4" />}
              label={copied ? "Copied!" : "Copy Address"}
              onClick={handleCopy}
            />
            <MenuItem
              icon={<ExternalLink className="w-4 h-4" />}
              label="View on Explorer"
              onClick={handleExplorer}
            />
            <MenuItem
              icon={<User className="w-4 h-4" />}
              label="Wallet Details"
              onClick={handleAccountModal}
            />
          </div>

          {/* Disconnect — separated at bottom */}
          <div className="border-t border-figma-surface">
            <MenuItem
              icon={<LogOut className="w-4 h-4" />}
              label="Disconnect"
              onClick={handleDisconnect}
              danger
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors text-left",
        danger
          ? "text-red-400 hover:bg-red-500/10"
          : "text-figma-white hover:bg-figma-surface"
      )}
    >
      <span className={cn(danger ? "text-red-400" : "text-figma-muted")}>
        {icon}
      </span>
      {label}
    </button>
  );
}
