import Menu from "@/components/home/menu/Menu";
import BannerSlider from "../../../components/home/bannerSlider/BannerSlider";
import HotGame from "@/components/home/All Game/HotGame";
import Slots from "@/components/home/All Game/Slots";
import Live from "@/components/home/All Game/Live";
import SportsGame from "@/components/home/All Game/SportsGame";
import ESportsGame from "@/components/home/All Game/ESportsGame";
import PokerGame from "@/components/home/All Game/PokerGame";
import LotteryGame from "@/components/home/All Game/LotteryGame";
import FishGame from "@/components/home/All Game/FishGame";
import MarqueeSlider from "@/components/home/Marque/MarqueeSlider";
import { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchHomeGameMenu } from "@/features/home-game-menu/GameHomeMenuSliceAndThunks";
import { fetchGameSection } from "@/features/GamePage/GamePageSliceAndThunk";
import AnimationBanner from "@/components/home/AnimationBanner/AnimationBanner";
import { Link } from "react-router-dom";
import img from "../../../assets/WhatsApp Image 2025-09-29 at 8.13.44 PM.png";
import PersonalCenterModal from "@/pages/PersonalCenterModal";
import { BiMoneyWithdraw } from "react-icons/bi";
import { RiLuggageDepositFill } from "react-icons/ri";
import HotsGame from "@/components/HotsGame/HotsGame";
import CategoryGames from "@/components/CategoryGames/CategoryGames";
import { AuthContext } from "@/Context/AuthContext";
import DownloadModal from "@/components/DownloadModal/DownloadModal";

const Home = () => {
  const dispatch = useDispatch();
  const { user } = useContext(AuthContext);

  const [allHotGames, setAllHotGames] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isInformationModalOpen, setIsInformationModalOpen] = useState(false);
  const [tab, setTab] = useState();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const { homeGameMenu, isLoading, isError, errorMessage } = useSelector(
    (state) => state.homeGameMenu,
  );

  const { data } = useSelector((state) => state.gameSection);

  useEffect(() => {
    if (!user) {
      setIsDownloadModalOpen(true);
    } else {
      setIsDownloadModalOpen(false);
    }
  }, [user]);

  useEffect(() => {
    const hotGames = data?.subMenu?.filter((item) =>
      item.games.some((game) => game.isHotGame === true),
    );
    setAllHotGames(hotGames);
  }, [data]);

  useEffect(() => {
    dispatch(fetchHomeGameMenu());
    dispatch(fetchGameSection());
  }, [dispatch]);

  useEffect(() => {
    const lastShownTime = localStorage.getItem("bannerLastShown");
    const currentTime = new Date().getTime();
    const tenMinutes = 10 * 60 * 1000;

    if (!lastShownTime || currentTime - parseInt(lastShownTime) >= tenMinutes) {
      localStorage.setItem("bannerLastShown", currentTime.toString());
    }
  }, []);

  const handleCloseOverlay = () => {
    setShowOverlay(false);
  };

  const actions = [
    {
      id: "tab2",
      label: "Deposit",
      icon: <RiLuggageDepositFill />,
      link: "/information#tab3",
      tab: "tab3",
    },
    {
      id: "tab3",
      label: "Withdrawal",
      icon: <BiMoneyWithdraw size={20} />,
      link: "/information#tab3",
      tab: "tab3",
    },
  ];

  return (
    <div className="px-3 sm:px-4">
      <DownloadModal
        open={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {showOverlay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            className="relative bg-[#004E56] shadow-md w-full max-w-5xl mx-auto my-2 lg:my-4 p-6 rounded-2xl border border-[rgba(0,28,44,.4)] overflow-hidden"
            style={{
              boxShadow:
                "rgb(0, 28, 44) 0px 1px 0px 0px, rgb(0, 97, 101) 0px 2px 0px 0px inset",
              zIndex: 5,
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                justifyContent: "flex-start",
                flexDirection: "row",
              }}
            >
              <div>
                <h2
                  style={{
                    justifySelf: "flex-start",
                    padding: "unset",
                    marginRight: "100px",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "rgba(48, 253, 202, 1)",
                    textTransform: "uppercase",
                  }}
                >
                  Welcome
                </h2>
              </div>
            </div>

            <div>
              <img
                src={img}
                alt="welcome image"
                style={{ width: "100%", height: "auto" }}
              />
            </div>

            <div
              style={{
                marginTop: "16px",
                textAlign: "center",
                color: "#ffbd2c",
                fontSize: "20px",
              }}
            >
              <p>লাল খামের বৃষ্টি এসে গেছে!</p>
            </div>

            <div
              style={{
                marginTop: "8px",
                textAlign: "center",
                color: "#ffbd2c",
                fontSize: "16px",
              }}
            >
              <p>
                রেড এনভেলপ রেইন ইভেন্টটি আনুষ্ঠানিকভাবে লাইভ! আমরা নিয়মগুলিতে
                কিছু সমন্বয় করেছি, তাই আসুন এবং সেগুলি পরীক্ষা করে দেখুন এবং
                জেতার জন্য প্রস্তুত হন।
              </p>
            </div>

            <button
              onClick={handleCloseOverlay}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "red",
                color: "white",
                border: "none",
                borderRadius: "5px",
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              X
            </button>
          </div>
        </div>
      )}

      <MarqueeSlider />
      <BannerSlider />

      <div
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          width: "80%",
          padding: "14px 4px",
          margin: "12px auto",
          background: "rgba(0, 0, 0, 0)",
          backgroundImage: "linear-gradient(#003840, rgb(0, 56, 64))",
          backgroundClip: "border-box",
          backgroundOrigin: "padding-box",
          backgroundPosition: "0% 0%",
          backgroundRepeat: "repeat",
          border: "2px solid #003840",
          borderRadius: "8px",
          borderBlockEndColor: "#002125ff",
          borderBlockStartColor: "#003840",
          borderBottomColor: "#002125ff",
          borderInlineEndColor: "#002125ff",
          borderInlineStartColor: "#002125ff",
          borderLeftColor: "#002125ff",
          borderRightColor: "#003840",
          borderTopColor: "#005461ff",
          transition: "all 0.3s ease",
          display: "none",
        }}
      >
        {actions.map((action, index) => (
          <Link
            to={action.link}
            key={index}
            onClick={() => {
              setTab(action.tab);
              setIsInformationModalOpen(true);
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "fit-content",
                minWidth: "100px",
                height: "40px",
                padding: "0 12px",
                fontSize: "16px",
                fontWeight: "700",
                color: "#b64100",
                textAlign: "center",
                textShadow: "0 2px 0 rgba(159, 52, 0, .2)",
                background: "linear-gradient(180deg, #ffe600, #ffb800)",
                border: "1px solid rgba(255, 242, 166, .5)",
                borderRadius: "12px",
                boxShadow: "inset 0 2px 0 1px #fff2a6, 0 2px 0 0 #b64100",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              className="hover:bg-[#d2b92c]"
            >
              {action.icon}
              {action.label}
            </div>
          </Link>
        ))}
      </div>

      <PersonalCenterModal
        tab={tab}
        isOpen={isInformationModalOpen}
        onClose={() => setIsInformationModalOpen(false)}
        name={"Home"}
      />

      <Menu
        homeGameMenu={homeGameMenu}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
      />

      <HotsGame />
      <AnimationBanner />
      <CategoryGames />
    </div>
  );
};

export default Home;
