import React, { useContext, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Edit3,
  Copy,
  Trophy,
  Sparkles,
  FileText,
  ClipboardList,
  Download,
  WalletCards,
  UserRound,
  ShieldCheck,
  Gift,
} from "lucide-react";
import { AuthContext } from "@/Context/AuthContext";
import DailyBonusModal from "../DailyBonusModal/DailyBonusModal";


const AccountModal = ({ open = true, onClose }) => {
  const {
    language,
    user,
    balance,
    refreshBalance,
    isBalanceLoading,
    setIsInformationModalOpen,
    setInitialTab,
  } = useContext(AuthContext);

  const [isDailyBonusModalOpen, setIsDailyBonusModalOpen] = useState(false);

  const isBangla = language === "bn";

  if (!open) return null;

  const username =
    user?.username || user?.name || user?.userName || user?.phone || "User";

  const nickname = user?.nickName || user?.nickname || username;

  const profileImage =
    user?.profileImage ||
    user?.avatar ||
    "https://images.185949949.com//TCG_PROD_IMAGES/B2C/01_PROFILE/PROFILE/0.png";

  const userBalance = Number(balance ?? user?.balance ?? 0).toFixed(2);

  const text = {
    title: isBangla ? "আমার অ্যাকাউন্ট" : "My Account",
    nickname: isBangla ? "ডাকনাম" : "Nickname",
    deposit: isBangla ? "জমা দিন" : "Deposit",
    withdraw: isBangla ? "উত্তোলন" : "Withdraw",
    myCard: isBangla ? "আমার কার্ড" : "My Card",
    memberCenter: isBangla ? "সদস্য সেন্টার" : "Member Center",
    rewardCenter: isBangla ? "পুরস্কার সেন্টার" : "Reward Center",
    bonusClaim: isBangla ? "বোনাস ক্লেইম" : "Bonus Claim",
    bettingRecord: isBangla ? "বেটিং রেকর্ড" : "Betting Record",
    profitLoss: isBangla ? "লাভ এবং লস" : "Profit & Loss",
    depositRecord: isBangla ? "জমা রেকর্ড" : "Deposit Record",
    withdrawRecord: isBangla ? "উত্তোলন রেকর্ড" : "Withdraw Record",
    accountRecord: isBangla ? "অ্যাকাউন্ট রেকর্ড" : "Account Record",
    myAccount: isBangla ? "আমার অ্যাকাউন্ট" : "My Account",
    securityCenter: isBangla ? "সুরক্ষা কেন্দ্র" : "Security Center",
  };

  const openInformationTab = (tabId) => {
    if (setInitialTab) setInitialTab(tabId);
    if (setIsInformationModalOpen) setIsInformationModalOpen(true);
    if (onClose) onClose();
  };

  const openDailyBonusModal = () => {
    setIsDailyBonusModalOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(username);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const menuItems = [
    { title: text.rewardCenter, icon: Trophy, tabId: "tab8" },
    { title: text.bonusClaim, icon: Gift, isDailyBonus: true },
    { title: text.bettingRecord, icon: Sparkles, tabId: "tab5" },
    { title: text.profitLoss, icon: FileText, tabId: "tab7" },
    { title: text.depositRecord, icon: ClipboardList, tabId: "tab6" },
    { title: text.withdrawRecord, icon: Download, tabId: "tab6" },
    { title: text.accountRecord, icon: WalletCards, tabId: "tab6" },
    { title: text.myAccount, icon: UserRound, tabId: "tab1" },
    { title: text.securityCenter, icon: ShieldCheck, tabId: "tab1" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-black/50 flex justify-center sm:items-center">
        <div className="w-full sm:max-w-[430px] h-screen sm:h-[92vh] bg-[#f7f7f7] sm:rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative h-[58px] bg-gradient-to-r from-[#2f2928] to-[#4a403d] flex items-center justify-center text-white">
            <button
              onClick={onClose}
              className="absolute left-4 top-1/2 -translate-y-1/2"
            >
              <ArrowLeft size={28} />
            </button>
            <h2 className="text-lg font-semibold">{text.title}</h2>
          </div>

          <div className="px-2 pt-2">
            <div className="relative rounded-[18px] bg-gradient-to-br from-[#eef4fb] via-[#f8fbff] to-[#e4edf7] min-h-[305px] overflow-hidden shadow-sm border border-white">
              <div className="absolute -right-16 -top-10 w-48 h-48 rounded-full bg-white/40" />
              <div className="absolute right-5 top-12 w-28 h-28 rounded-full border-[14px] border-white/35" />

              <div className="relative px-7 pt-8">
                <div className="flex items-start gap-4">
                  <div className="w-[92px] h-[92px] rounded-full bg-white p-1.5 shadow">
                    <img
                      src={profileImage}
                      alt="avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>

                  <div className="pt-1 flex-1">
                    <div className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-gradient-to-r from-[#777] to-[#9b9b9b] text-white text-sm font-bold">
                      🏆 VIP0
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[#222] font-bold text-lg">
                      <span>{username}</span>
                      <button onClick={handleCopy} type="button">
                        <Copy size={16} className="text-black" />
                      </button>
                    </div>

                    <div className="mt-2 text-sm text-[#777] font-semibold flex items-center gap-1">
                      <span>
                        {text.nickname}: {nickname}
                      </span>
                      <button
                        type="button"
                        onClick={() => openInformationTab("tab1")}
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <h3 className="text-[30px] font-bold text-[#414141]">
                    ৳ {userBalance}
                  </h3>
                  <button type="button" onClick={refreshBalance}>
                    <RefreshCw
                      size={22}
                      className={`text-[#9aa1a9] ${
                        isBalanceLoading ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => openInformationTab("tab3")}
                    className="h-9 rounded-full bg-white text-[#555] shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
                  >
                    {text.deposit}
                  </button>
                  <button
                    type="button"
                    onClick={() => openInformationTab("tab4")}
                    className="h-9 rounded-full bg-white text-[#555] shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
                  >
                    {text.withdraw}
                  </button>
                  <button
                    type="button"
                    onClick={() => openInformationTab("tab1")}
                    className="h-9 rounded-full bg-white text-[#555] shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
                  >
                    {text.myCard}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-7 mt-6">
            <div className="inline-block bg-[#e5e5e5] text-[#777] text-sm font-bold rounded-full px-4 py-1">
              {text.memberCenter}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-y-4 pb-6">
              {menuItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      item.isDailyBonus
                        ? openDailyBonusModal()
                        : openInformationTab(item.tabId)
                    }
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <div className="w-[54px] h-[54px] rounded-full bg-[#fff3d9] flex items-center justify-center">
                      <Icon
                        size={22}
                        strokeWidth={1.8}
                        className="text-[#d6b76c]"
                      />
                    </div>
                    <span className="text-[14px] leading-[18px] text-[#777] whitespace-pre-line">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DailyBonusModal
        open={isDailyBonusModalOpen}
        onClose={() => setIsDailyBonusModalOpen(false)}
      />
    </>
  );
};

export default AccountModal;
