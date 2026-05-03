import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEdit,
  FaImage,
  FaPlusCircle,
  FaSave,
  FaServer,
  FaSpinner,
  FaSyncAlt,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const API =
  import.meta.env.VITE_REACT_APP_BACKEND_API2 || "http://localhost:5002";

const ORACLE_PROVIDER_API = "https://api.oraclegames.live/api/providers";
const ORACLE_PROVIDER_KEY = import.meta.env.VITE_ORACLE_TOKEN;

const defaultForm = {
  categoryId: "",
  providerId: "",
  providerIcon: null,
  status: "active",
};

const getImageUrl = (path = "") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? path : `/${path}`}`;
};

const AddProvider = () => {
  const [categories, setCategories] = useState([]);
  const [oracleProviders, setOracleProviders] = useState([]);
  const [savedProviders, setSavedProviders] = useState([]);

  const [form, setForm] = useState(defaultForm);
  const [preview, setPreview] = useState("");
  const [oldIconUrl, setOldIconUrl] = useState("");
  const [removeOldIcon, setRemoveOldIcon] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((item) => item._id === form.categoryId);
    return cat
      ? `${cat?.categoryName?.en || ""} / ${cat?.categoryName?.bn || ""}`
      : "";
  }, [categories, form.categoryId]);

  const selectedProviderName = useMemo(() => {
    const provider = oracleProviders.find(
      (item) => String(item.providerCode) === String(form.providerId),
    );
    return provider?.providerName || "";
  }, [oracleProviders, form.providerId]);

  const fetchCategories = async () => {
    const { data } = await axios.get(`${API}/api/categories`);
    setCategories(data?.data || []);
  };

  const fetchOracleProviders = async () => {
    const { data } = await axios.get(ORACLE_PROVIDER_API, {
      headers: {
        "x-api-key": ORACLE_PROVIDER_KEY,
      },
    });

    setOracleProviders(data?.data || []);
  };

  const fetchSavedProviders = async (categoryId = form.categoryId) => {
    try {
      if (!categoryId) {
        setSavedProviders([]);
        return;
      }

      setListLoading(true);
      const { data } = await axios.get(
        `${API}/api/game-providers?categoryId=${categoryId}`,
      );

      setSavedProviders(data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Provider fetch failed");
    } finally {
      setListLoading(false);
    }
  };

  const loadPageData = async () => {
    try {
      setPageLoading(true);
      await Promise.all([fetchCategories(), fetchOracleProviders()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Page data load failed");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    fetchSavedProviders(form.categoryId);
  }, [form.categoryId]);

  const resetForm = () => {
    setForm((prev) => ({
      ...defaultForm,
      categoryId: prev.categoryId,
    }));
    setEditingId(null);
    setPreview("");
    setOldIconUrl("");
    setRemoveOldIcon(false);
  };

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      toast.error("Only jpeg, jpg, png, webp image allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setForm((prev) => ({
      ...prev,
      providerIcon: file,
    }));

    setPreview(URL.createObjectURL(file));
    setRemoveOldIcon(false);
  };

  const handleRemoveIcon = () => {
    setForm((prev) => ({
      ...prev,
      providerIcon: null,
    }));

    setPreview("");

    if (oldIconUrl) {
      setOldIconUrl("");
      setRemoveOldIcon(true);
    }
  };

  const handleEdit = (provider) => {
    setEditingId(provider._id);

    setForm({
      categoryId: provider?.categoryId?._id || provider?.categoryId || "",
      providerId: provider?.providerId || "",
      providerIcon: null,
      status: provider?.status || "active",
    });

    const iconUrl = getImageUrl(provider?.providerIcon || "");
    setOldIconUrl(iconUrl);
    setPreview(iconUrl);
    setRemoveOldIcon(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.categoryId) {
      toast.error("Please select category");
      return;
    }

    if (!form.providerId) {
      toast.error("Please select provider");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("categoryId", form.categoryId);
      fd.append("providerId", form.providerId);
      fd.append("status", form.status);

      if (form.providerIcon instanceof File) {
        fd.append("providerIcon", form.providerIcon);
      }

      if (isEditing) {
        fd.append("removeOldIcon", removeOldIcon ? "true" : "false");

        const { data } = await axios.put(
          `${API}/api/game-providers/${editingId}`,
          fd,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        toast.success(data?.message || "Provider updated successfully");
      } else {
        const { data } = await axios.post(`${API}/api/game-providers`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        toast.success(data?.message || "Provider created successfully");
      }

      const currentCategory = form.categoryId;
      resetForm();
      setForm((prev) => ({ ...prev, categoryId: currentCategory }));
      fetchSavedProviders(currentCategory);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (provider) => {
    const ok = window.confirm(
      `Are you sure you want to delete provider ${provider.providerId}?`,
    );
    if (!ok) return;

    try {
      setDeletingId(provider._id);

      const { data } = await axios.delete(
        `${API}/api/game-providers/${provider._id}`,
      );

      toast.success(data?.message || "Provider deleted successfully");

      if (editingId === provider._id) {
        resetForm();
      }

      fetchSavedProviders(form.categoryId);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
      />

      <div className="min-h-screen px-4 md:px-8 pb-10 text-emerald-50">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-green-950 via-emerald-950 to-black shadow-2xl shadow-emerald-950/50 overflow-hidden">
            <div className="border-b border-emerald-800/50 bg-gradient-to-r from-emerald-900/70 via-green-900/60 to-black px-5 md:px-8 py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-900/60">
                    <FaServer className="text-2xl text-white" />
                  </div>

                  <div>
                    <h1 className="text-2xl md:text-4xl font-black text-white">
                      {isEditing ? "Update Provider" : "Add Provider"}
                    </h1>
                    <p className="text-emerald-200/80 mt-1">
                      Category select করে Oracle provider save করুন।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadPageData}
                  disabled={pageLoading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-800/60 hover:bg-emerald-700/70 border border-emerald-600/50 text-white font-semibold transition-all cursor-pointer disabled:opacity-60"
                >
                  <FaSyncAlt className={pageLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="p-5 md:p-8">
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-emerald-200 mb-2">
                      Select Category
                    </label>

                    <select
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          categoryId: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-emerald-800/60 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    >
                      <option className="bg-black" value="">
                        Choose category
                      </option>

                      {categories.map((cat) => (
                        <option
                          className="bg-black"
                          key={cat._id}
                          value={cat._id}
                        >
                          {cat?.categoryName?.en} / {cat?.categoryName?.bn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-emerald-200 mb-2">
                      Select Oracle Provider
                    </label>

                    <select
                      value={form.providerId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          providerId: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-emerald-800/60 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    >
                      <option className="bg-black" value="">
                        Choose provider
                      </option>

                      {oracleProviders.map((provider) => (
                        <option
                          className="bg-black"
                          key={provider._id || provider.providerCode}
                          value={provider.providerCode}
                        >
                          {provider.providerName} ({provider.providerCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-emerald-200 mb-2">
                      Provider Icon Upload
                    </label>

                    <label className="flex flex-col items-center justify-center gap-3 min-h-[180px] rounded-2xl border-2 border-dashed border-emerald-700/70 bg-black/40 hover:bg-emerald-950/30 transition-all cursor-pointer">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Provider Icon"
                          className="w-28 h-28 object-contain rounded-2xl border border-emerald-700/50 bg-black/50 p-2"
                        />
                      ) : (
                        <FaImage className="text-5xl text-emerald-300/80" />
                      )}

                      <div className="text-center">
                        <p className="font-semibold text-white">
                          Click to upload provider icon
                        </p>
                        <p className="text-sm text-emerald-200/70">
                          jpeg, jpg, png, webp | max 5MB
                        </p>
                      </div>

                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleIconChange}
                        className="hidden"
                      />
                    </label>

                    {preview && (
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 transition-all cursor-pointer"
                      >
                        <FaTimes />
                        Remove Icon
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-emerald-200 mb-2">
                      Status
                    </label>

                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-emerald-800/60 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    >
                      <option className="bg-black" value="active">
                        Active
                      </option>
                      <option className="bg-black" value="inactive">
                        Inactive
                      </option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg shadow-emerald-950/60 border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin" />
                      ) : isEditing ? (
                        <FaSave />
                      ) : (
                        <FaPlusCircle />
                      )}
                      {loading
                        ? isEditing
                          ? "Updating..."
                          : "Creating..."
                        : isEditing
                          ? "Update Provider"
                          : "Create Provider"}
                    </button>

                    {(isEditing || preview) && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-white font-bold border border-slate-600/50 transition-all cursor-pointer"
                      >
                        <FaTimes />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-800/60 bg-black/40 p-5 h-fit">
                  <h3 className="text-xl font-black text-white mb-5">
                    Live Preview
                  </h3>

                  <div className="rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-black via-emerald-950/50 to-black p-5 text-center">
                    <div className="mx-auto w-28 h-28 rounded-3xl border border-emerald-700/50 bg-black/50 flex items-center justify-center overflow-hidden">
                      {preview ? (
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <FaImage className="text-5xl text-emerald-300/70" />
                      )}
                    </div>

                    <h4 className="mt-4 text-xl font-black text-white">
                      {selectedProviderName || "Provider Name"}
                    </h4>

                    <p className="mt-1 font-mono text-sm text-emerald-200/80">
                      {form.providerId || "Provider Code"}
                    </p>

                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                        {selectedCategoryName || "No Category"}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          form.status === "active"
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                            : "border-red-400/30 bg-red-500/10 text-red-200"
                        }`}
                      >
                        {form.status}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-emerald-800/50 p-5 md:p-8">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-white">
                    Saved Providers
                  </h2>
                  <p className="text-sm text-emerald-200/70">
                    Total: {savedProviders.length}
                  </p>
                </div>

                {form.categoryId && (
                  <button
                    type="button"
                    onClick={() => fetchSavedProviders(form.categoryId)}
                    disabled={listLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-700/70 border border-emerald-600/50 text-white font-semibold transition-all cursor-pointer disabled:opacity-60"
                  >
                    <FaSyncAlt className={listLoading ? "animate-spin" : ""} />
                    Refresh List
                  </button>
                )}
              </div>

              {!form.categoryId ? (
                <div className="py-14 text-center rounded-2xl border border-emerald-800/50 bg-black/30 text-emerald-100">
                  Select a category to view saved providers
                </div>
              ) : listLoading ? (
                <div className="py-14 flex justify-center rounded-2xl border border-emerald-800/50 bg-black/30 text-emerald-200">
                  <FaSpinner className="animate-spin text-3xl" />
                </div>
              ) : savedProviders.length === 0 ? (
                <div className="py-14 text-center rounded-2xl border border-emerald-800/50 bg-black/30 text-emerald-100">
                  No provider found in this category
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {savedProviders.map((provider) => (
                    <div
                      key={provider._id}
                      className="rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-black via-emerald-950/50 to-black p-5 shadow-xl shadow-emerald-950/40"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-2xl border border-emerald-700/50 bg-black/50 flex items-center justify-center overflow-hidden shrink-0">
                          {provider.providerIcon ? (
                            <img
                              src={getImageUrl(provider.providerIcon)}
                              alt={provider.providerId}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <FaImage className="text-3xl text-emerald-300/70" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black text-white truncate">
                            {oracleProviders.find(
                              (item) =>
                                String(item.providerCode) ===
                                String(provider.providerId),
                            )?.providerName || "Unknown Provider"}
                          </h3>

                          <p className="font-mono text-sm text-emerald-200/75 truncate">
                            {provider.providerId}
                          </p>

                          <p className="text-xs text-emerald-200/60 mt-1 truncate">
                            {provider?.categoryId?.categoryName?.en || ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            provider.status === "active"
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                              : "border-red-400/30 bg-red-500/10 text-red-200"
                          }`}
                        >
                          {provider.status}
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(provider)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 border border-blue-400/30 px-4 py-3 font-bold transition-all cursor-pointer"
                        >
                          <FaEdit />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(provider)}
                          disabled={deletingId === provider._id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-400/30 px-4 py-3 font-bold transition-all cursor-pointer disabled:opacity-60"
                        >
                          {deletingId === provider._id ? (
                            <FaSpinner className="animate-spin" />
                          ) : (
                            <FaTrash />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddProvider;
