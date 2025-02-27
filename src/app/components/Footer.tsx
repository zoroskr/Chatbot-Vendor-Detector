import GithubIcon from "@/app/assets/icons/GithubIcon";

const Footer = () => {
  return (
    <footer className="w-full py-3 bg-gray-800 text-gray-400 text-sm flex items-center justify-center gap-4 font-medium">
      <p>© {new Date().getFullYear()} Chatbot Vendor Detector</p>
      <span>|</span>
      <p>
        Developed by{" "}
        <a href="https://github.com/JCAlmazan" className="hover:text-indigo-400 transition">
          Juan Cruz
        </a>{" "}
        &{" "}
        <a href="https://github.com/FacundoAlmazan" className="hover:text-indigo-400 transition">
          Facundo
        </a>
      </p>
      <span>|</span>
      <a
        href="https://github.com/JCAlmazan/Chatbot-Vendor-Detector"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:text-indigo-400 transition"
      >
        <GithubIcon /> GitHub Repo
      </a>
    </footer>
  );
};

export default Footer;
