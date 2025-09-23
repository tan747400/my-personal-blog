import { useEffect, useState } from "react";
import { HeroSection } from "../components/SiteSections";
import ArticleSection from "../components/ArticleSection";

export default function Home() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profiles"); // เรียก API ของ serverless function
        const json = await res.json();
        setProfile(json.data); // { name: "john", age: 20 }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  return (
    <>
      <HeroSection />
      <ArticleSection />

      {/* ส่วนทดสอบเรียก API */}
      <div className="mx-auto max-w-2xl mt-10 p-6 rounded-xl border border-stone-200 bg-white shadow">
        <h2 className="text-xl font-bold mb-2">Test API /profiles</h2>
        {profile ? (
          <p>
            Name: <span className="font-semibold">{profile.name}</span>, Age:{" "}
            <span className="font-semibold">{profile.age}</span>
          </p>
        ) : (
          <p className="text-stone-500">Loading profile...</p>
        )}
      </div>
    </>
  );
}


// import { HeroSection } from "../components/SiteSections";
// import ArticleSection from "../components/ArticleSection";

// export default function Home() {
//   return (
//     <>
//       <HeroSection />
//       <ArticleSection />
//     </>
//   );
// }