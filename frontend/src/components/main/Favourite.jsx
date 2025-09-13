import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../context/AuthContext";

const Favourite = () => {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchFavourites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites") // ✅ fixed table name
        .select(`
          fav_uuid,
          file:f_uuid(
            f_uuid,
            f_name,
            language,
            created_at,
            department:d_uuid(d_name)
          )
        `)
        .eq("uuid", user.id) // ✅ fixed column name
        .order("created_at", { ascending: false });

      if (!error) {
        setFavourites((data || []).filter(row => row.file));
      } else {
        setFavourites([]);
        console.error("Error fetching favourites:", error);
      }
      setLoading(false);
    };

    fetchFavourites();
  }, [user?.id]);

  return (
    <div className="p-8 bg-white min-h-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Favourites</h1>

      {loading ? (
        <p className="text-gray-600">Loading favourites...</p>
      ) : favourites.length === 0 ? (
        <p className="text-gray-500">No favourite files yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {favourites.map((fav) => {
            const file = fav.file;
            return (
              <div
                key={fav.fav_uuid}
                className="bg-gray-50 rounded-lg shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105"
                style={{ minHeight: "180px" }}
              >
                <div className="w-full">
                  <div className="text-xl font-semibold text-gray-800 mb-2">
                    {file.f_name}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Department: {file.department?.d_name || "Unknown"}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Language: {file.language || "Unknown"}
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  {file.created_at
                    ? new Date(file.created_at).toLocaleString()
                    : "Unknown"}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(`/file/${file.f_uuid}`, "_blank", "noopener,noreferrer")
                    }
                    className="inline-block px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Favourite;