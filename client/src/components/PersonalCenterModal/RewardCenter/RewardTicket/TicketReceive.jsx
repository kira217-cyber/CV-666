import { useContext } from "react";
import { AuthContext } from "@/Context/AuthContext";
import promoBg from "../../../../assets/promo-bg.b716fece.jpg";
import promoLeftBg from "../../../../assets/WhatsApp Image 2025-04-14 at 04.24.56_f89f7f5d.jpg";
import promoRightBg from "../../../../assets/rightBg.jpg";

const TicketReceive = () => {
  const { language = "en" } = useContext(AuthContext);

  const text = {
    bn: {
      noTicket: "কোন টিকেট পাওয়া যায় নি",
      coupon: "কুপন",
      amount: "০০০",
      expiry: "শেষ তারিখ ----.--.--",
      remaining: "বাকি",
      days: "দিন",
      receive: "প্রাপ্ত করুন",
    },
    en: {
      noTicket: "No ticket received",
      coupon: "Coupon",
      amount: "000",
      expiry: "Expiry Date ----.--.--",
      remaining: "Remaining",
      days: "days",
      receive: "Receive",
    },
  };

  const t = text[language] || text.en;

  return (
    <div className="w-full">
      <div
        style={{ backgroundImage: `url(${promoBg})` }}
        className="w-full bg-cover bg-center rounded-md overflow-hidden"
      >
        <div className="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <h3 className="text-base sm:text-lg font-semibold text-[#555] text-center mb-4 sm:mb-6">
            {t.noTicket}
          </h3>

          <div className="flex gap-3 sm:gap-4 max-w-2xl w-full justify-center items-center">
            <div className="relative w-1/2 rounded-xl overflow-hidden shadow-lg min-h-[110px] sm:min-h-[150px]">
              <img
                src={promoLeftBg}
                alt="Coupon"
                className="w-full h-full object-cover absolute inset-0"
              />

              <h3 className="absolute top-2 left-2 text-[10px] sm:text-xs text-white px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm">
                {t.coupon}
              </h3>

              <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-lg sm:text-xl font-extrabold drop-shadow-2xl">
                {t.amount}
              </p>

              <p className="absolute bottom-2 left-2 text-white text-[8px] sm:text-[10px] px-2 py-[2px] rounded bg-black/50 backdrop-blur">
                {t.expiry}
              </p>
            </div>

            <div className="relative w-1/2 rotate-6 sm:rotate-12 rounded-xl overflow-hidden shadow-lg min-h-[110px] sm:min-h-[150px]">
              <img
                src={promoRightBg}
                alt="Countdown"
                className="w-full h-full object-cover absolute inset-0"
              />

              <h3 className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs bg-yellow-500 text-black px-2 sm:px-3 py-1 rounded-md font-bold shadow-md whitespace-nowrap">
                {t.remaining}
              </h3>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-white">
                <h3 className="text-base sm:text-xl font-bold drop-shadow-md whitespace-nowrap">
                  00 {t.days}
                </h3>

                <p className="text-xs sm:text-sm drop-shadow">00:00</p>
              </div>

              <button className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-white text-red-600 text-[7px] sm:text-[9px] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg hover:bg-gray-100 transition whitespace-nowrap">
                {t.receive}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReceive;
