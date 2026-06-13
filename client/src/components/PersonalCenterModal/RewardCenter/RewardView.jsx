import { useContext, useState } from "react";
import { GrTask } from "react-icons/gr";
import { AiFillFund } from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { FaChevronLeft } from "react-icons/fa";
import SignInTask from "./SignInTask/SignInTask";
import Fund from "./RescueFund/Fund";
import giftIconImage from "../../../assets/gift_icon.f6429730.png";
import giftBgImage from "../../../assets/gift_bg.e5aebbb5.png";
import taskIconImage from "../../../assets/task_icon.7b721102.png";
import taskBgImage from "../../../assets/task_bg.3fa1608c.png";
import moneyIconImage from "../../../assets/money_icon.578db6fe.png";
import moneyBgImage from "../../../assets/money_bg.31139bae.png";
import inviteIconImage from "../../../assets/invite_icon.bad8d6b3.png";
import inviteBgImage from "../../../assets/invite_bg.8cef5c32.png";
import Claim from "./Claim/Claim";
import Invite from "../InviteFriends/Invite";
import { AuthContext } from "@/Context/AuthContext";

const RewardView = () => {
  const { language } = useContext(AuthContext);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const items = [
    {
      icon: <GrTask />,
      imageIcon: giftIconImage,
      imageBg: giftBgImage,
      title: language === "bn" ? "দাবি করা" : "Claim",
      text:
        language === "bn"
          ? "একটি টাস্ক প্রক্রিয়াধীন রয়েছে।"
          : "A task is in progress",
      action: "Claim",
      button: language === "bn" ? "দেখুন" : "View",
    },
    {
      icon: <GrTask />,
      imageIcon: taskIconImage,
      imageBg: taskBgImage,
      title: language === "bn" ? "সাইন ইন" : "Sign In",
      text:
        language === "bn"
          ? "একটি টাস্ক প্রক্রিয়াধীন রয়েছে।"
          : "A task is in progress",
      action: "SignIn",
      button: language === "bn" ? "দেখুন" : "View",
    },
    {
      icon: <AiFillFund />,
      imageIcon: moneyIconImage,
      imageBg: moneyBgImage,
      title: language === "bn" ? "উদ্ধার তহবিল" : "Rescue Fund",
      text: language === "bn" ? "পুনর্জীবনের জন্য সহায়তা।" : "Help to reborn",
      action: "RescueFund",
      button: language === "bn" ? "দেখুন" : "View",
    },
    {
      icon: <AiFillFund />,
      imageIcon: inviteIconImage,
      imageBg: inviteBgImage,
      title: language === "bn" ? "বন্ধুদের আমন্ত্রণ জানান" : "Invite Friend",
      text: language === "bn" ? "পুনর্জীবনের জন্য সহায়তা।" : "Help to reborn",
      action: "Invite",
      button: language === "bn" ? "দেখুন" : "View",
    },
  ];

  const closeModal = () => {
    setSelectedItem(null);
    setActiveModal(null);
  };

  return (
    <div className="w-full">
      <div className="hidden lg:block">
        {items
          .filter((_, index) => index === 1 || index === 2)
          .map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 cursor-pointer p-2 rounded"
            >
              <span className="text-3xl text-white bg-bgYellow rounded-full p-2 shrink-0">
                {item.icon}
              </span>

              <div className="flex flex-col w-[40%]">
                <p className="font-semibold text-gray-800">{item.title}</p>
                <p className="text-sm text-gray-600">{item.text}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedItem(item);
                  setActiveModal(item.action);
                }}
                className="bg-white text-black hover:text-opacity-50 hover:bg-blue-50 px-4 rounded-full"
              >
                {item.button}
              </button>
            </div>
          ))}
      </div>

      <div className="lg:hidden grid grid-cols-2 gap-2 px-2 sm:px-4">
        {items.map((item, index) => (
          <button
            type="button"
            className="relative w-full overflow-hidden rounded-lg"
            key={index}
            onClick={() => {
              setSelectedItem(item);
              setActiveModal(item.action);
            }}
          >
            <img src={item.imageBg} alt="" className="w-full h-auto" />

            <div className="absolute -translate-x-1/2 w-full -translate-y-1/2 top-1/2 left-1/2 flex flex-col items-center gap-2 px-2">
              <div className="bg-white rounded-full md:w-20 md:h-20 w-10 h-10 flex items-center justify-center">
                <img
                  src={item.imageIcon}
                  alt=""
                  className="md:w-[60%] w-[50%]"
                />
              </div>

              <p className="text-xs md:text-base text-white text-center leading-tight">
                {item.title}
              </p>
            </div>
          </button>
        ))}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-[99999] flex justify-end bg-black/60 overflow-hidden"
          onClick={closeModal}
        >
          <div
            className="flex lg:w-auto w-full h-full"
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
                  onClick={closeModal}
                  className="text-white text-sm rounded-full p-1 bg-red-600"
                >
                  <RxCross1 />
                </button>
              </div>

              <h3>view</h3>
            </div>

            <div className="w-full lg:w-[720px] h-full bg-white shadow-lg overflow-y-auto">
              <div className="flex lg:hidden bg-informationBG justify-between items-center px-4 py-3 border-b sticky top-0 z-10">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white"
                >
                  <FaChevronLeft />
                </button>

                <h2 className="text-sm px-2 w-full text-white text-center">
                  {selectedItem.title}
                </h2>

                <span className="w-4" />
              </div>

              <div className="min-h-screen text-gray-700">
                {activeModal === "Claim" && <Claim />}
                {activeModal === "SignIn" && <SignInTask />}
                {activeModal === "RescueFund" && <Fund />}
                {activeModal === "Invite" && <Invite />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardView;
