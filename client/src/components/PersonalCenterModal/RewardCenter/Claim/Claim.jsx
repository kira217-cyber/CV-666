import { useContext } from "react";
import { AuthContext } from "@/Context/AuthContext";
import userImage from "../../../../assets/0.png";
import claimImage from "../../../../assets/claim-bg.5d092411.jpg";

const Claim = () => {
  const { user, balance, language } = useContext(AuthContext);

  const formattedBalance = Number(balance || 0).toFixed(2);

  return (
    <div className="w-full">
      <div className="relative">
        <img
          src={claimImage}
          alt=""
          className="w-full h-[170px] sm:h-[200px] object-cover"
        />

        <div className="flex items-center gap-2 absolute rounded-md top-4 left-1/2 -translate-x-1/2 w-[85%] sm:w-[70%] lg:w-auto lg:bottom-0 lg:top-auto lg:left-0 lg:-translate-x-0 lg:static">
          <img
            src={userImage}
            alt="User"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full shrink-0"
          />

          <div className="flex flex-col lg:leading-normal leading-tight min-w-0">
            <div className="flex flex-col items-start text-white font-semibold bg-black/20 lg:bg-transparent px-2 py-1 rounded">
              <p className="font-medium truncate max-w-[180px]">
                {user?.username || user?.whatsapp || "User"}
              </p>

              <p>৳ {formattedBalance}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center py-10 px-4">
        <p className="text-[#ccc] text-base sm:text-lg text-center">
          {language === "bn" ? "এখনও কোনও প্রচার নেই" : "No promotion yet"}
        </p>
      </div>
    </div>
  );
};

export default Claim;
