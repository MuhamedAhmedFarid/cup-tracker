import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lvaibigbhtplmxbnroca.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YWliaWdiaHRwbG14Ym5yb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTAyMTQsImV4cCI6MjA2NjM2NjIxNH0.zuF5olemFNu5InqeJBDkkcBQMorHEYo6yLlykAL9OIE";
const supabase = createClient(supabaseUrl, supabaseKey);

import { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import { Progress } from "./components/ui/progress";
import { Heart, Clock, Camera } from "lucide-react";

export default function App() {
  const [userTimestamps, setUserTimestamps] = useState([]);
  const [gfTimestamps, setGfTimestamps] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nextCupTime, setNextCupTime] = useState(0);
  const [tab, setTab] = useState("tracker");
  const goal = 10;

  const userCups = userTimestamps.length;
  const gfCups = gfTimestamps.length;

  useEffect(() => {
    const fetchCups = async () => {
      const { data: userCupsData, error: userError } = await supabase // Added error variable
        .from("user_cups")
        .select("*");
      const { data: gfCupsData, error: gfError } = await supabase.from("gf_cups").select("*"); // Added error variable

      if (userError) console.error("Error fetching user cups:", userError); // Log errors
      if (gfError) console.error("Error fetching GF cups:", gfError); // Log errors

      setUserTimestamps(userCupsData || []);
      setGfTimestamps(gfCupsData || []);
    };
    fetchCups();
  }, []);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      setTimeLeft(midnight.getTime() - now.getTime()); // Use getTime() for consistent millisecond comparison
    };
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const getNextCupCountdown = (timestamps) => {
    if (!timestamps.length) return 0;
    // Ensure the timestamp is treated as UTC from DB, then compare
    const lastTimestampUTC = new Date(timestamps[timestamps.length - 1].time + 'Z'); // *** Added 'Z' here ***
    const nextAllowedTimeUTC = new Date(lastTimestampUTC.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    return Math.max(0, nextAllowedTimeUTC.getTime() - new Date().getTime());
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setNextCupTime(getNextCupCountdown(userTimestamps));
    }, 1000);
    return () => clearInterval(interval);
  }, [userTimestamps]);

  const formatTime = (ms) => {
    if (ms <= 0) return "0h 0m 0s";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const handleAddUserCup = async () => {
    const newCupEntry = { time: new Date().toISOString(), photo: null };
    const { data, error } = await supabase.from("user_cups").insert([newCupEntry]).select(); // .select() to get back the inserted ID if needed for id

    if (error) {
      console.error("Error adding user cup:", error);
    } else {
      // Supabase insert returns an array with the new record, use data[0]
      setUserTimestamps((prevTimestamps) => [...prevTimestamps, data[0]]);
    }
  };

  const handleAddGfCup = async () => {
    const newCupEntry = { time: new Date().toISOString(), photo: null };
    const { data, error } = await supabase.from("gf_cups").insert([newCupEntry]).select(); // .select() to get back the inserted ID

    if (error) {
      console.error("Error adding GF cup:", error);
    } else {
      setGfTimestamps((prevTimestamps) => [...prevTimestamps, data[0]]);
    }
  };

  const handleRemoveUserCup = async () => {
    if (userTimestamps.length > 0) {
      const cupToRemove = userTimestamps[userTimestamps.length - 1];
      if (!cupToRemove || !cupToRemove.id) { // Ensure there's an ID to remove
          console.warn("No ID found for last user cup to remove.");
          return;
      }

      const { error } = await supabase
        .from("user_cups")
        .delete()
        .eq("id", cupToRemove.id);

      if (error) {
        console.error("Error removing user cup:", error);
      } else {
        // Filter out the removed cup by its ID to ensure correct state update
        setUserTimestamps((prevTimestamps) =>
          prevTimestamps.filter((cup) => cup.id !== cupToRemove.id)
        );
      }
    }
  };

  const handleRemoveGfCup = async () => {
    if (gfTimestamps.length > 0) {
      const cupToRemove = gfTimestamps[gfTimestamps.length - 1];
      if (!cupToRemove || !cupToRemove.id) { // Ensure there's an ID to remove
          console.warn("No ID found for last GF cup to remove.");
          return;
      }

      const { error } = await supabase
        .from("gf_cups")
        .delete()
        .eq("id", cupToRemove.id);

      if (error) {
        console.error("Error removing GF cup:", error);
      } else {
        // Filter out the removed cup by its ID
        setGfTimestamps((prevTimestamps) =>
          prevTimestamps.filter((cup) => cup.id !== cupToRemove.id)
        );
      }
    }
  };

  const handlePhotoUpload = async (event, index, isUser) => {
    const file = event.target.files[0];
    if (!file) return;

    const filePath = `${isUser ? 'user_cups' : 'gf_cups'}/${Date.now()}_${file.name}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Error uploading photo:", uploadError);
        // You might want to display a user-friendly error message here
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(uploadData.path);

      if (!publicUrlData || !publicUrlData.publicUrl) {
          console.error("Could not get public URL for uploaded photo.");
          return;
      }
      const photoUrl = publicUrlData.publicUrl;

      const currentTimestamps = isUser ? userTimestamps : gfTimestamps;
      const cupToUpdate = currentTimestamps[index];

      if (!cupToUpdate || !cupToUpdate.id) {
          console.error("Cup record not found or missing ID for photo update.");
          return;
      }

      const { error: updateError } = await supabase
        .from(isUser ? "user_cups" : "gf_cups")
        .update({ photo: photoUrl })
        .eq("id", cupToUpdate.id);

      if (updateError) {
        console.error("Error updating photo URL in DB:", updateError);
        // Display user-friendly error
        return;
      }

      const updatedTimestamps = [...currentTimestamps];
      updatedTimestamps[index] = { ...updatedTimestamps[index], photo: photoUrl };
      isUser ? setUserTimestamps(updatedTimestamps) : setGfTimestamps(updatedTimestamps);

      console.log('Photo uploaded and URL saved:', photoUrl);

    } catch (generalError) {
      console.error("An unexpected error occurred during photo upload:", generalError);
      // Display user-friendly error
    }
  };

  const allPhotos = [
    ...userTimestamps
      .filter((t) => t.photo)
      .map((t) => ({ src: t.photo, user: "Simo" })),
    ...gfTimestamps
      .filter((t) => t.photo)
      .map((t) => ({ src: t.photo, user: "Emi" })),
  ];

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-start p-6 gap-6">
      <h1 className="text-3xl font-bold text-blue-700 mb-4">
        💧 Couple Water Tracker
      </h1>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === "tracker" ? "default" : "outline"}
          onClick={() => setTab("tracker")}
        >
          Tracker
        </Button>
        <Button
          variant={tab === "gallery" ? "default" : "outline"}
          onClick={() => setTab("gallery")}
        >
          Gallery
        </Button>
      </div>

      {tab === "tracker" && (
        <>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="text-blue-500" size={16} />
            <span>Time left today: {formatTime(timeLeft)}</span>
          </div>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Clock className="text-green-500" size={16} />
            <span>Next cup available in: {formatTime(nextCupTime)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <Card className="w-80 bg-white shadow-xl rounded-2xl p-4">
              <CardContent className="flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-2 text-sky-400">
                  Simo
                </h2>
                <Progress
                  value={(userCups / goal) * 100}
                  className="w-full mb-2"
                />
                <p className="text-sm text-gray-500 mb-4">
                  {userCups} / {goal} cups{" "}
                  {userCups > goal && (
                    <span className="text-green-600">🚀 Overachiever!</span>
                  )}
                </p>
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={handleAddUserCup}
                    className="bg-sky-400 hover:bg-sky-500 text-white"
                  >
                    +1 Cup
                  </Button>
                  <Button variant="outline" onClick={handleRemoveUserCup}>
                    -1
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {userTimestamps.map((entry, index) => (
                    <div
                      key={entry.id || index}
                      className="text-xs text-gray-500 flex items-center gap-1"
                    >
                      🕒{" "}
                      {/* FIX: Append 'Z' to treat as UTC, then convert to local */}
                      {new Date(entry.time + 'Z').toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <label className="cursor-pointer">
                        <Camera size={14} className="text-sky-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, index, true)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="w-80 bg-white shadow-xl rounded-2xl p-4">
              <CardContent className="flex flex-col items-center">
                <h2 className="text-xl font-semibold mb-2 text-red-600">Emi</h2>
                <Progress
                  value={(gfCups / goal) * 100}
                  className="w-full mb-2 bg-red-100"
                />
                <p className="text-sm text-gray-500 mb-4">
                  {gfCups} / {goal} cups{" "}
                  {gfCups > goal && (
                    <span className="text-green-600">🌟 Overachiever!</span>
                  )}
                </p>
                <div className="flex gap-2 mb-2">
                  <Button
                    onClick={handleAddGfCup}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    +1 Cup
                  </Button>
                  <Button variant="outline" onClick={handleRemoveGfCup}>
                    -1
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {gfTimestamps.map((entry, index) => (
                    <div
                      key={entry.id || index}
                      className="text-xs text-gray-500 flex items-center gap-1"
                    >
                      🕒{" "}
                      {/* FIX: Append 'Z' to treat as UTC, then convert to local */}
                      {new Date(entry.time + 'Z').toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <label className="cursor-pointer">
                        <Camera size={14} className="text-red-500" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, index, false)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 text-lg">
            {userCups > gfCups && <p>Simo is winning today! 💪</p>}
            {gfCups > userCups && <p>Emi is winning today! 😍</p>}
            {gfCups === userCups && userCups > 0 && (
              <p>Simo and Emi are tied! Keep it up 💖</p>
            )}
          </div>

          <Heart className="text-red-500 mt-4" size={32} />
        </>
      )}

      {tab === "gallery" && (
        <div className="w-full max-w-5xl">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            📸 Daily Photo Gallery
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {allPhotos.map((photo, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <img
                  src={photo.src}
                  alt="entry"
                  className="w-40 h-40 rounded-xl object-cover shadow-md"
                />
                <span className="text-sm mt-2 text-gray-700 font-medium">
                  {photo.user}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}