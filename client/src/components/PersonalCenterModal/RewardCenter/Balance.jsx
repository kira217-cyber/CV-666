import { useContext, useState } from "react";
import { AuthContext } from "@/Context/AuthContext";

const Balance = () => {
  const { balance, refreshBalance, isBalanceLoading } = useContext(AuthContext);
  const [showBalance, setShowBalance] = useState(true);

  const formattedBalance = Number(balance || 0).toFixed(2);

  const toggleBalanceVisibility = () => {
    setShowBalance((prev) => !prev);
  };

  return (
    <div className="lg:hidden">
      <div className="px-1 sm:px-3 h-5 text-[#25252599] flex flex-row items-center">
        <div className="flex flex-row text-base items-center font-medium">
          <span className="py-2 pr-1">৳</span>

          <span>
            {isBalanceLoading ? "..." : showBalance ? formattedBalance : "-"}
          </span>
        </div>

        <div className="flex flex-row items-center py-2">
          <button
            type="button"
            onClick={refreshBalance}
            disabled={isBalanceLoading}
            className="ml-2 md:pt-1 disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${isBalanceLoading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#25252599"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1 2.13-9" />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleBalanceVisibility}
            className="ml-2"
          >
            {showBalance ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#25252599"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#25252599"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a17.33 17.33 0 0 1 2.31-3.81" />
                <path d="M9.53 9.53A3 3 0 0 1 12 9c1.66 0 3 1.34 3 3a3 3 0 0 1-.53 1.71" />
                <path d="M1 1l22 22" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Balance;
