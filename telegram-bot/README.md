# 🤖 IELTS Prep Studio — 1-Tap Telegram Approval & Fulfillment Bot

Eliminates manual screenshot checking, Excel copy-pasting, and customer support fatigue.

```
Student sends slip on Telegram 
  ↳ Forwarded to your phone with [✅ Approve] button
    ↳ Tap [✅ Approve] (1 second)
      ↳ Student automatically receives 1-Click Magic Link (?redeem=IPS-VIP-XXX)
```

---

## ⚡ 2-Minute Quick Setup

### Step 1: Create your Bot in Telegram
1. Open Telegram and search for **[@BotFather](https://t.me/BotFather)**.
2. Send `/newbot`.
3. Choose a name (e.g. `IELTS Prep Studio VIP`) and username (e.g. `IELTSPrepStudioBot` or `IPSVipBot`).
4. Copy the **HTTP API Token** provided by BotFather.

### Step 2: Get your Admin User ID
1. Open Telegram and search for **[@userinfobot](https://t.me/userinfobot)**.
2. Tap `/start`. It will reply with your numeric **Id** (e.g. `761262240`).

### Step 3: Configure `.env`
Inside `telegram-bot/`, create a file named `.env` (or copy from `.env.example`):

```ini
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
ADMIN_CHAT_ID=761262240
PAYMENT_PHONE=09-768691939
ACCOUNT_NAME=Lyan Htet
PRICE_MMK=55,000 MMK
STUDIO_WEB_URL=https://ielts-prep-studio.web.app
```

### Step 4: Run the Bot
From your terminal:

```bash
cd telegram-bot
npm start
```

You will see:
```text
🤖 IELTS Prep Studio Telegram Bot Initializing...
🚀 Telegram Bot is LIVE! Logged in as @YourBotName
👉 Student Entrypoint: https://t.me/YourBotName
🛡️ Admin Chat ID bound to: 761262240
```

---

## 🎮 How It Works

1. **Student Flow**:
   - Student taps `/start` on your bot.
   - Bot displays KPay & WavePay payment details (`09-768691939`, 55,000 MMK) and asks for the transaction slip screenshot.
   - Student uploads screenshot.
   - Bot instantly replies: *"✅ စလစ်အား လက်ခံရရှိပါပြီ။ Admin ဘက်မှ အတည်ပြုပြီးပါက 1-Click Link ပေးပို့ပေးပါမည်။"*

2. **Admin Experience (1 Tap)**:
   - Bot forwards the slip to your personal Telegram with student details and two buttons:
     `[ ✅ Approve & Issue Pass ]` | `[ ❌ Reject ]`
   - You tap **`[ ✅ Approve ]`** on your phone.

3. **Automated Delivery**:
   - Bot automatically claims the next available voucher (e.g. `IPS-VIP-101`) from `IELTS_Studio_Voucher_Codes.csv`.
   - Bot sends the student a celebratory Burmese message with their unique **1-Click Magic Link**:
     `https://ielts-prep-studio.web.app/?redeem=IPS-VIP-101`
   - Student taps the link $\rightarrow$ signs in with Google $\rightarrow$ Lifetime VIP is unlocked in 2 seconds.

---

## 🛠️ Admin Commands (Send in Bot)
- `/stats`: View total vouchers, sold, remaining, and total MMK revenue collected.
- `/mint 20`: Mint 20 additional passes on the fly.
