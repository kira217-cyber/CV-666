import RewardBalance from "./RewardBalance";
import RewardTicket from "./RewardTicket/RewardTicket";
import RewardView from "./RewardView";

const Reward = () => {
  return (
    <div className="w-full min-h-[500px] lg:min-h-0 overflow-y-auto custom-scrollbar-hidden bg-white">
      <div className="w-full lg:flex lg:gap-4">
        <div className="w-full lg:w-[55%] lg:p-4 lg:pt-6">
          <RewardBalance />

          <div className="mt-10 lg:mt-4">
            <RewardView />
          </div>
        </div>

        <div className="w-full lg:w-[45%] mt-4 lg:mt-0 px-2 lg:px-0">
          <RewardTicket />
        </div>
      </div>
    </div>
  );
};

export default Reward;
