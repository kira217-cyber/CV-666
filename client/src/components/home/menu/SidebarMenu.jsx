import { AuthContext } from "@/Context/AuthContext";
import { useEffect, useState, useContext } from "react";
import axios from "axios";
import {
  BsFire,
  BsGift,
  BsStar,
  BsChatDots,
  BsDownload,
  BsGlobe,
  BsX,
} from "react-icons/bs";
import { FaUserFriends, FaTrophy, FaUsers } from "react-icons/fa";
import { Link } from "react-router-dom";
import styled from "styled-components";

const API = import.meta.env.VITE_API_URL

const getImageUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

/* ────────────────────── Styled Components ────────────────────── */
const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 20px;
`;

const MenuItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  padding: 16px 8px;
  background: linear-gradient(to bottom, #003840, #002125);
  border: 1px solid #003840;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);

  &:hover {
    background: linear-gradient(to bottom, #0a6670, #00404c);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`;

const IconWrapper = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  svg {
    font-size: 26px;
    color: #cd6d5f;
  }
`;

const Label = styled.p`
  color: #e0fff7;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  margin: 0;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #001f24;
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 300px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #e0fff7;
  font-size: 20px;
  cursor: pointer;
`;

const LanguageOption = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(to right, #003840, #002125);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(to right, #0a6670, #00404c);
  }

  img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  span {
    color: #e0fff7;
    font-size: 14px;
    font-weight: 600;
  }
`;

const normalizeKey = (value = "") =>
  String(value).trim().toUpperCase().replace(/_/g, "-").replace(/\s+/g, " ");

const getCategoryPath = (category) => {
  const enName = normalizeKey(category?.categoryName?.en);

  if (enName === "FAVOURITE" || enName === "FAVORITE") {
    return `/category/${category._id}`;
  }

  return `/category/${category._id}`;
};

const SidebarMenu = () => {
  const { language, setLanguage } = useContext(AuthContext);

  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get(`${API}/api/categories/active`);

        const sortedCategories = [...(data?.data || [])].sort((a, b) => {
          const orderA = Number(a?.order ?? 0);
          const orderB = Number(b?.order ?? 0);

          if (orderA !== orderB) return orderA - orderB;

          return new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0);
        });

        setCategories(sortedCategories);
      } catch (error) {
        console.log("Failed to load categories", error);
      }
    };

    fetchCategories();
  }, []);

  const openLanguageModal = (e) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("sidebarLang", lang);
    closeModal();
  };

  const t = {
    bn: {
      রেফার: "রেফার",
      প্রমোশন: "প্রমোশন",
      পুরস্কার: "পুরস্কার",
      ভিআইপি: "ভিআইপি",
      মিশন: "মিশন",
      ডাউনলোড: "ডাউনলোড",
      চ্যাট: "চ্যাট",
      "HOT GAMES": "গরম খেলা",
      SLOTS: "স্লট",
      POKER: "পোকার",
      LIVE: "লাইভ কেসিন",
      SPORTS: "স্পোর্টস",
      "E-SPORTS": "ই-স্পোর্টস",
      FISHING: "ফিশিং",
      LOTTERY: "লটারি",
      FAVORITES: "পছন্দের",
      FAVORITE: "পছন্দের",
      FAVOURITE: "পছন্দের",
      "REWARD CENTER": "পুরস্কার কেন্দ্র",
      "MANUAL REBATE": "ম্যানুয়াল রিবেট",
      "CUSTOMER SERVICE": "গ্রাহক সেবা",
      LANGUAGE_BN: "বাংলা",
      LANGUAGE_EN: "English",
    },
    en: {
      রেফার: "Refer",
      প্রমোশন: "Promotion",
      পুরস্কার: "Rewards",
      ভিআইপি: "VIP",
      মিশন: "Mission",
      ডাউনলোড: "Download",
      চ্যাট: "Chat",
      "HOT GAMES": "Hot Games",
      SLOTS: "Slots",
      POKER: "Poker",
      LIVE: "Live Casino",
      SPORTS: "Sports",
      "E-SPORTS": "E-Sports",
      FISHING: "Fishing",
      LOTTERY: "Lottery",
      FAVORITES: "Favorites",
      FAVORITE: "Favorites",
      FAVOURITE: "Favorites",
      "REWARD CENTER": "Reward Center",
      "MANUAL REBATE": "Manual Rebate",
      "CUSTOMER SERVICE": "Customer Service",
      LANGUAGE_BN: "Bangla",
      LANGUAGE_EN: "English",
    },
  };

  const translate = (key) => t?.[language]?.[key] || key;

  const hotGamesItem = {
    id: "hot-games",
    label: translate("HOT GAMES"),
    key: "HOT GAMES",
    icon: <BsFire />,
    path: "/hot-games",
  };

  const dynamicMenuItems = categories.map((category) => {
    const enName = category?.categoryName?.en || "";
    const bnName = category?.categoryName?.bn || "";
    const key = normalizeKey(enName);

    return {
      id: category._id,
      key,
      label: language === "bn" ? bnName || enName : enName || bnName,
      icon: category?.iconUrl ? (
        <img src={getImageUrl(category.iconUrl)} alt={enName || bnName} />
      ) : (
        <BsStar />
      ),
      path: getCategoryPath(category),
    };
  });

  const languageButtonLabel = translate(
    language === "bn" ? "LANGUAGE_BN" : "LANGUAGE_EN",
  );

  const staticMenuItems = [
    {
      id: 2,
      label: "রেফার",
      key: "রেফার",
      icon: <FaUserFriends />,
      path: "",
    },
    {
      id: 4,
      label: "প্রমোশন",
      key: "প্রমোশন",
      icon: <BsGift />,
      path: "/promotions",
    },
    {
      id: 6,
      label: "পুরস্কার",
      key: "পুরস্কার",
      icon: <FaTrophy />,
      path: "",
    },
    {
      id: 10,
      label: "ভিআইপি",
      key: "ভিআইপি",
      icon: <BsStar />,
      path: "",
    },
    {
      id: 12,
      label: "মিশন",
      key: "মিশন",
      icon: <FaUsers />,
      path: "",
    },
    {
      id: 14,
      label: languageButtonLabel,
      icon: <BsGlobe />,
      path: "",
      onClick: openLanguageModal,
    },
    {
      id: 16,
      label: "ডাউনলোড",
      key: "ডাউনলোড",
      icon: <BsDownload />,
      path: "/bg444.apk",
      download: true,
    },
    {
      id: 18,
      label: "চ্যাট",
      key: "চ্যাট",
      icon: <BsChatDots />,
      path: "",
    },
  ];

  const leftMenuItems = [hotGamesItem, ...dynamicMenuItems];

  return (
    <>
      <Container>
        <div className="space-y-2">
          {leftMenuItems.map((item) => (
            <Link key={item.id} to={item.path}>
              <MenuItem>
                <IconWrapper>{item.icon}</IconWrapper>
                <Label>{item.label || translate(item.key)}</Label>
              </MenuItem>
            </Link>
          ))}
        </div>

        <div className="space-y-2">
          {staticMenuItems.map((item) => (
            <div key={item.id} onClick={item.onClick}>
              {item.onClick ? (
                <MenuItem>
                  <IconWrapper>{item.icon}</IconWrapper>
                  <Label>{item.label}</Label>
                </MenuItem>
              ) : item.download ? (
                <a href={item.path} download>
                  <MenuItem>
                    <IconWrapper>{item.icon}</IconWrapper>
                    <Label>{translate(item.key) || item.label}</Label>
                  </MenuItem>
                </a>
              ) : (
                <Link to={item.path}>
                  <MenuItem>
                    <IconWrapper>{item.icon}</IconWrapper>
                    <Label>{translate(item.key) || item.label}</Label>
                  </MenuItem>
                </Link>
              )}
            </div>
          ))}
        </div>
      </Container>

      {isModalOpen && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <CloseButton onClick={closeModal}>
              <BsX />
            </CloseButton>

            <LanguageOption onClick={() => changeLanguage("bn")}>
              <img src="https://flagcdn.com/w40/bd.png" alt="Bangladesh" />
              <span>{translate("LANGUAGE_BN")}</span>
            </LanguageOption>

            <LanguageOption onClick={() => changeLanguage("en")}>
              <img src="https://flagcdn.com/w40/us.png" alt="USA" />
              <span>{translate("LANGUAGE_EN")}</span>
            </LanguageOption>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default SidebarMenu;
