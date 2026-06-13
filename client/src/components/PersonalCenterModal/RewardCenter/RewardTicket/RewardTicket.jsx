import { useState, useContext } from "react";
import { AuthContext } from "@/Context/AuthContext";
import TicketRecordImage from "../../../../assets/ticket-records.a568aa3b.svg";
import TicketReceive from "./TicketReceive";
import TicketRecord from "./TicketRecord";

const RewardTicket = () => {
  const { language = "en" } = useContext(AuthContext);
  const [activeModal, setActiveModal] = useState(null);

  const text = {
    bn: {
      receiveCenter: "প্রাপ্তি কেন্দ্র",
      ticketRecord: "টিকিটের রেকর্ড",
    },
    en: {
      receiveCenter: "Receive Center",
      ticketRecord: "Ticket Record",
    },
  };

  const t = text[language] || text.en;

  return (
    <div className="bg-white w-full">
      <div className="text-[#4c11d3] py-2 flex flex-col sm:flex-row sm:gap-8 lg:gap-12 sm:items-center gap-2 px-2">
        <p className="text-black border-l-4 px-2 border-[#4c11d3] font-medium">
          {t.receiveCenter}
        </p>

        <button
          type="button"
          className="flex gap-2 px-4 py-1 cursor-pointer rounded-full bg-[#4c11d3]/10 hover:bg-[#4c11d3] transition-all duration-300 group w-fit"
          onClick={() => setActiveModal("TicketRecord")}
        >
          <img
            src={TicketRecordImage}
            alt="Ticket Record"
            className="w-5 h-5"
          />

          <p className="text-black group-hover:text-white font-medium text-sm sm:text-base">
            {t.ticketRecord}
          </p>
        </button>
      </div>

      <TicketReceive />

      <TicketRecord activeModal={activeModal} setActiveModal={setActiveModal} />
    </div>
  );
};

export default RewardTicket;
