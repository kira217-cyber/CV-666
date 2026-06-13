import { useContext } from "react";
import { RxCross1 } from "react-icons/rx";
import { FaChevronLeft } from "react-icons/fa";
import ReusableTabs from "../../BattingAccountProfitLoss/ReusableTabs";
import { AuthContext } from "@/Context/AuthContext";

const TicketRecord = ({ activeModal, setActiveModal }) => {
  const { language } = useContext(AuthContext);

  const tabData = [
    {
      tabTitle: { en: "Sport", bn: "স্পোর্টস" },
      radioTabs: [
        {
          label: { en: "Today", bn: "আজ" },
          tableData: [],
        },
        {
          label: { en: "Yesterday", bn: "গতকাল" },
          tableData: [
            {
              betTime: "11:00 AM",
              betAmount: "৳ 150.00",
              validBet: "৳ 140.00",
              award: "৳ 100.00",
              profitLoss: "-৳ 40.00",
              gameName: "Poker",
              gameNumber: "G456",
            },
          ],
        },
        {
          label: { en: "7 days", bn: "৭ দিন" },
          tableData: [],
        },
      ],
    },
  ];

  const filter = [
    { label: { en: "Vendor", bn: "বিক্রেতা" }, value: "vendor" },
    {
      label: { en: "Transaction Type", bn: "লেনদেন প্রকার" },
      value: "transactionType",
    },
    { label: { en: "Ticket Type", bn: "টিকিটের ধরন" }, value: "ticketType" },
  ];

  const tabOptions = [
    { label: { en: "All", bn: "সব" }, value: "all" },
    { label: { en: "Red Rain", bn: "রেড রেন" }, value: "jili" },
    { label: { en: "Golden Egg", bn: "সোনারি ডিম" }, value: "pg" },
    { label: { en: "Reward Wheel", bn: "পুরস্কার চাকা" }, value: "jdb" },
    {
      label: { en: "Cash Receipt", bn: "টাকা প্রাপ্তির রশিদ" },
      value: "cash_receipt",
    },
    {
      label: { en: "Merchandise Voucher", bn: "মার্চেন্ডাইজ ভাউচার" },
      value: "merch_voucher",
    },
    {
      label: { en: "Free Spin Voucher", bn: "ফ্রি স্পিন ভাউচার" },
      value: "free_spin_voucher",
    },
  ];

  if (!activeModal) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex justify-end bg-black/60 overflow-hidden"
      onClick={() => setActiveModal(null)}
    >
      <div
        className="flex w-full lg:w-auto h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative hidden lg:flex flex-col justify-center gap-4">
          <div
            className="bg-white w-full p-2 absolute top-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 66%)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-white text-sm rounded-full p-1 bg-red-600"
            >
              <RxCross1 />
            </button>
          </div>

          <h3>Record</h3>
        </div>

        <div className="bg-white w-full lg:w-[760px] h-full p-0 lg:p-4 shadow-lg relative overflow-y-auto">
          <div className="lg:hidden sticky top-0 z-10 flex items-center bg-informationBG px-4 py-3">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="text-white"
            >
              <FaChevronLeft />
            </button>

            <h2 className="text-center text-sm font-semibold text-white flex-1">
              {language === "bn" ? "টিকিটের রেকর্ড" : "Ticket Record"}
            </h2>

            <span className="w-4" />
          </div>

          <h2 className="hidden lg:block text-center text-lg font-semibold mb-4 text-gray-800">
            {language === "bn" ? "টিকিটের রেকর্ড" : "Ticket Record"}
          </h2>

          <div className="p-2 lg:p-0">
            <ReusableTabs
              data={tabData}
              filterOptions={tabOptions}
              filters={filter[0]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketRecord;
