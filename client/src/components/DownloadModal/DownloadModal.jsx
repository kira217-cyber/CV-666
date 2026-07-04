import React, { useContext } from "react";
import { X } from "lucide-react";
import { FaAndroid, FaChrome } from "react-icons/fa";
import { AuthContext } from "@/Context/AuthContext";

const DownloadModal = ({ open = true, onClose }) => {
  const { language } = useContext(AuthContext);
  const isBn = language === "bn";

  if (!open) return null;

  const logoUrl = "https://cv-666.live/assets/footer-CmI_p8va.png";
  const apkUrl = "/CV666.apk";
  const browserUrl = "https://oracleapkstore.com/";

  const text = {
    title: isBn ? "CV-666 APP ডাউনলোড করুন" : "Download CV-666 APP",
    browser: isBn ? "ব্রাউজার ব্যবহার করুন" : "Keep using the browser",
    download: isBn ? "ডাউনলোড" : "Download",
    app: "CV-666",
    chrome: isBn ? "Chrome এ খুলুন" : "Open in Chrome",
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = apkUrl;
    link.download = "CV666.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenBrowser = () => {
    window.open(browserUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center bg-black/20 px-2 pb-3">
      <div className="relative w-full max-w-[375px] min-h-[178px] rounded-[18px] overflow-hidden shadow-2xl animate-[slideUp_.25s_ease-out]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center blur-[1px]" />
        <div className="absolute inset-0 bg-white/65 backdrop-blur-[3px]" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 w-9 h-9 rounded-full bg-gray-300/80 flex items-center justify-center text-gray-700"
        >
          <X size={22} />
        </button>

        <div className="relative z-10 px-6 pt-4 pb-3">
          <div className="flex items-center gap-3 pr-10">
            <img
              src={logoUrl}
              alt="logo"
              className="w-[50px] h-[50px] rounded-full object-contain"
            />

            <h2 className="text-[16px] text-orange-500 whitespace-nowrap">
              {text.title}
            </h2>
          </div>

          <div className="mt-5 h-px bg-white/70" />

          <div className="mt-5 flex flex-col items-center">
            <button
              type="button"
              onClick={handleOpenBrowser}
              className="text-[18px] leading-none font-bold text-blue-500 underline"
            >
              {text.browser}
            </button>

            <div className="mt-2 grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={handleDownload}
                className="relative h-[39px] rounded-[6px] bg-[#3b82f6] text-white flex items-center justify-center gap-2 shadow-md overflow-hidden"
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] bg-orange-500 px-3 rounded-b text-white">
                  {text.download}
                </span>
                <FaAndroid size={21} className="mt-2" />
                <span className="font-bold text-[15px] mt-2">{text.app}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBrowser}
                className="h-[39px] rounded-[6px] bg-white/80 border-2 border-[#3b82f6] text-[#2563eb] flex items-center justify-center gap-2 shadow-md"
              >
                <FaChrome size={22} />
                <span className="text-[14px]">{text.chrome}</span>
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(120%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default DownloadModal;
