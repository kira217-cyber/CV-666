import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaGift,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaTimes,
  FaSave,
} from "react-icons/fa";
import { toast } from "react-toastify";
import DailyBonusClaimHistory from "../components/DailyBonusClaimHistory/DailyBonusClaimHistory";

const API_BASE = import.meta.env.VITE_REACT_APP_BACKEND_API2;

const emptyForm = {
  title: {
    bn: "",
    en: "",
  },
  periodDays: 1,
  amount: 0,
  isActive: true,
  order: 0,
};

const DailyBonus = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const token = useMemo(() => {
    return localStorage.getItem("token") || localStorage.getItem("adminToken");
  }, []);

  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/daily-bonus-settings");
      setItems(res?.data?.data || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Daily bonus data load failed",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item?.title?.bn?.toLowerCase().includes(q) ||
      item?.title?.en?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: {
        bn: item?.title?.bn || "",
        en: item?.title?.en || "",
      },
      periodDays: item?.periodDays || 1,
      amount: item?.amount || 0,
      isActive: item?.isActive ?? true,
      order: item?.order || 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (field, value) => {
    if (field === "title.bn" || field === "title.en") {
      const key = field.split(".")[1];

      setForm((prev) => ({
        ...prev,
        title: {
          ...prev.title,
          [key]: value,
        },
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.bn && !form.title.en) {
      toast.error("Please enter title");
      return;
    }

    if (Number(form.periodDays) < 1) {
      toast.error("Period days must be minimum 1");
      return;
    }

    if (Number(form.amount) < 0) {
      toast.error("Amount cannot be negative");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: {
          bn: form.title.bn,
          en: form.title.en,
        },
        periodDays: Number(form.periodDays),
        amount: Number(form.amount),
        isActive: Boolean(form.isActive),
        order: Number(form.order),
      };

      if (editingId) {
        await api.put(`/api/daily-bonus-settings/${editingId}`, payload);
        toast.success("Daily bonus updated successfully");
      } else {
        await api.post("/api/daily-bonus-settings", payload);
        toast.success("Daily bonus created successfully");
      }

      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Are you sure you want to delete this bonus?");
    if (!ok) return;

    try {
      await api.delete(`/api/daily-bonus-settings/${id}`);
      toast.success("Daily bonus deleted successfully");
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <>
      {" "}
      <div className="bg-gradient-to-br from-green-950 via-emerald-950 to-black p-4 md:p-8 text-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-b from-green-950 via-emerald-950/90 to-black border border-emerald-800/40 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-emerald-800/50 bg-gradient-to-r from-emerald-900/80 via-green-900/70 to-black/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-900/60">
                  <FaGift className="text-2xl text-white" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-white">Daily Bonus</h1>
                  <p className="text-sm text-emerald-200/80">
                    Manage daily bonus settings
                  </p>
                </div>
              </div>

              <button
                onClick={openCreate}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-medium shadow-md shadow-emerald-900/50 cursor-pointer"
              >
                <FaPlus />
                Add Bonus
              </button>
            </div>

            <div className="p-5">
              <div className="relative mb-5">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 placeholder-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="overflow-x-auto border border-emerald-800/40 rounded-xl">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-emerald-950/70">
                    <tr>
                      <th className="p-4 text-left text-emerald-200">Order</th>
                      <th className="p-4 text-left text-emerald-200">
                        Title BN
                      </th>
                      <th className="p-4 text-left text-emerald-200">
                        Title EN
                      </th>
                      <th className="p-4 text-left text-emerald-200">
                        Period Days
                      </th>
                      <th className="p-4 text-left text-emerald-200">Amount</th>
                      <th className="p-4 text-left text-emerald-200">Status</th>
                      <th className="p-4 text-right text-emerald-200">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center">
                          <div className="flex items-center justify-center gap-3 text-emerald-300">
                            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            Loading...
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-emerald-200/70"
                        >
                          No daily bonus found
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr
                          key={item._id}
                          className="border-t border-emerald-800/30 hover:bg-emerald-950/40 transition"
                        >
                          <td className="p-4">{item.order}</td>
                          <td className="p-4">{item?.title?.bn || "-"}</td>
                          <td className="p-4">{item?.title?.en || "-"}</td>
                          <td className="p-4">{item.periodDays}</td>
                          <td className="p-4">{item.amount}</td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                item.isActive
                                  ? "bg-emerald-800/50 text-emerald-100 border-emerald-600/50"
                                  : "bg-red-800/40 text-red-200 border-red-600/50"
                              }`}
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-3 rounded-lg bg-blue-700/40 hover:bg-blue-700/70 text-blue-100 cursor-pointer"
                              >
                                <FaEdit />
                              </button>

                              <button
                                onClick={() => handleDelete(item._id)}
                                className="p-3 rounded-lg bg-red-700/40 hover:bg-red-700/70 text-red-100 cursor-pointer"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {modalOpen && (
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-gradient-to-b from-green-950 via-emerald-950 to-black border border-emerald-800/50 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="p-5 border-b border-emerald-800/50 bg-gradient-to-r from-emerald-900/80 via-green-900/70 to-black/80 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? "Update Daily Bonus" : "Add Daily Bonus"}
                  </h2>

                  <button
                    onClick={closeModal}
                    className="p-2.5 rounded-xl hover:bg-emerald-900/40 text-emerald-300 hover:text-emerald-100 cursor-pointer"
                  >
                    <FaTimes size={22} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Title Bangla
                      </label>
                      <input
                        value={form.title.bn}
                        onChange={(e) =>
                          handleChange("title.bn", e.target.value)
                        }
                        placeholder="বাংলা টাইটেল"
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 placeholder-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Title English
                      </label>
                      <input
                        value={form.title.en}
                        onChange={(e) =>
                          handleChange("title.en", e.target.value)
                        }
                        placeholder="English title"
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 placeholder-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Period Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.periodDays}
                        onChange={(e) =>
                          handleChange("periodDays", e.target.value)
                        }
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.amount}
                        onChange={(e) => handleChange("amount", e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Order
                      </label>
                      <input
                        type="number"
                        value={form.order}
                        onChange={(e) => handleChange("order", e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm text-emerald-200">
                        Status
                      </label>
                      <select
                        value={form.isActive ? "active" : "inactive"}
                        onChange={(e) =>
                          handleChange("isActive", e.target.value === "active")
                        }
                        className="w-full px-4 py-3 bg-black/50 border border-emerald-800/60 rounded-xl text-emerald-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                      >
                        <option className="bg-emerald-950" value="active">
                          Active
                        </option>
                        <option className="bg-emerald-950" value="inactive">
                          Inactive
                        </option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 disabled:from-gray-700 disabled:to-gray-700 rounded-xl text-white font-medium transition-all shadow-lg shadow-emerald-900/50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        {editingId ? "Update Bonus" : "Save Bonus"}
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DailyBonusClaimHistory />
    </>
  );
};

export default DailyBonus;
