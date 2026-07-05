/**
 * Lickfun Telegram Bot — Group management
 * - Welcomes new members with a Lickfun-branded message.
 * - Restricts them from posting until they tap "✅ I'm human".
 * - Auto-kicks (ban + unban) anyone who doesn't verify within the timeout.
 */
import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import { config } from "./config.js";
import { formatWelcomePrompt, formatWelcomeVerified } from "./format.js";
import { addPending, getPending, removePending } from "./state.js";

const VERIFY_ACTION_PREFIX = "verify:";

export function createBot(): Telegraf {
  const bot = new Telegraf(config.telegram.botToken);

  /* ── New member joins ── */
  bot.on("new_chat_members", async (ctx) => {
    const message = ctx.message;
    if (!("new_chat_members" in message)) return;

    const chatId = ctx.chat!.id;

    for (const member of message.new_chat_members) {
      // Skip if the bot itself was added
      if (member.is_bot && member.username === ctx.botInfo?.username) continue;

      const userId = member.id;
      const userName = member.first_name || member.username || "there";

      try {
        // Restrict the new member: can't send any messages until verified.
        await ctx.telegram.restrictChatMember(chatId, userId, {
          permissions: {
            can_send_messages: false,
            can_send_audios: false,
            can_send_documents: false,
            can_send_photos: false,
            can_send_videos: false,
            can_send_video_notes: false,
            can_send_voice_notes: false,
            can_send_polls: false,
            can_send_other_messages: false,
            can_add_web_page_previews: false,
          },
        });
      } catch (err) {
        console.error(
          `[bot] Failed to restrict user ${userId} in chat ${chatId} (is the bot an admin with 'Ban users' permission?):`,
          err,
        );
      }

      const promptText = formatWelcomePrompt(
        userName,
        config.behaviour.verifyTimeoutSeconds,
      );

      let sentMessageId: number | undefined;
      try {
        const sent = await ctx.telegram.sendMessage(chatId, promptText, {
          parse_mode: "HTML",
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback(
              "✅ I'm human",
              `${VERIFY_ACTION_PREFIX}${userId}`,
            ),
          ]).reply_markup,
        });
        sentMessageId = sent.message_id;
      } catch (err) {
        console.error("[bot] Failed to send welcome prompt:", err);
        continue;
      }

      const timeout = setTimeout(async () => {
        const pendingEntry = getPending(chatId, userId);
        if (!pendingEntry) return; // already verified/removed

        try {
          // Kick: ban then immediately unban so they CAN rejoin later.
          await ctx.telegram.banChatMember(chatId, userId);
          await ctx.telegram.unbanChatMember(chatId, userId, {
            only_if_banned: true,
          });
        } catch (err) {
          console.error(`[bot] Failed to kick unverified user ${userId}:`, err);
        }

        try {
          if (sentMessageId) {
            await ctx.telegram.deleteMessage(chatId, sentMessageId);
          }
        } catch {
          /* message may already be gone — ignore */
        }

        removePending(chatId, userId);
      }, config.behaviour.verifyTimeoutSeconds * 1000);

      addPending({
        userId,
        chatId,
        messageId: sentMessageId ?? 0,
        timeout,
      });
    }
  });

  /* ── Verify button tap ── */
  bot.action(new RegExp(`^${VERIFY_ACTION_PREFIX}(\\d+)$`), async (ctx) => {
    const match = ctx.match as RegExpMatchArray;
    const targetUserId = Number(match[1]);
    const tappedUserId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!chatId || !tappedUserId) return;

    // Only the intended user can verify themselves.
    if (tappedUserId !== targetUserId) {
      await ctx.answerCbQuery("This verification isn't for you 🚫", {
        show_alert: true,
      });
      return;
    }

    const pendingEntry = getPending(chatId, targetUserId);
    if (!pendingEntry) {
      await ctx.answerCbQuery("Verification already handled.");
      return;
    }

    try {
      // Lift restrictions — restore normal send permissions.
      await ctx.telegram.restrictChatMember(chatId, targetUserId, {
        permissions: {
          can_send_messages: true,
          can_send_audios: true,
          can_send_documents: true,
          can_send_photos: true,
          can_send_videos: true,
          can_send_video_notes: true,
          can_send_voice_notes: true,
          can_send_polls: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
    } catch (err) {
      console.error(`[bot] Failed to lift restrictions for ${targetUserId}:`, err);
    }

    removePending(chatId, targetUserId);

    const userName = ctx.from?.first_name || ctx.from?.username || "friend";

    try {
      await ctx.editMessageText(formatWelcomeVerified(userName), {
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("[bot] Failed to edit verification message:", err);
    }

    await ctx.answerCbQuery("✅ Verified! Welcome to Lickfun.");
  });

  bot.catch((err, ctx: Context) => {
    console.error(`[bot] Unhandled error for update ${ctx.updateType}:`, err);
  });

  return bot;
}
