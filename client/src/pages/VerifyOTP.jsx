import React, { useState, useEffect, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { toast } from "react-hot-toast";

const VerifyOTP = () => {
  const { login } = useContext(AuthContext);
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the email passed from the Login or Register page state
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      toast.error("Session expired. Please login again.");
      navigate("/login");
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (value, index) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    // Take only the last character if user types over an existing digit
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move focus to next box if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Move focus to previous box on backspace if current box is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const data = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    data.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    
    // Focus the last filled input
    const lastIndex = Math.min(data.length, 5);
    inputRefs.current[lastIndex].focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      return toast.error("Please enter a valid 6-digit OTP");
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/verify-otp", {
        email,
        otp: otpCode,
      });
      
      login(data);
      toast.success("Email verified! Welcome to CineCircle.");
      const audio = new Audio("/login.mp3");
      audio.play().catch(e => console.error("Login sound failed", e));
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    try {
      await api.post("/api/auth/resend-otp", { email });
      toast.success("A new OTP has been sent to your inbox.");
      setTimer(60); // Start 60s cooldown
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-900 px-3 py-6 text-white sm:px-5 md:px-8 lg:px-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-5 shadow-xl sm:p-8">
        <h2 className="text-3xl font-extrabold mb-2 text-center text-blue-400">Verify Your Account</h2>
        <p className="mb-8 break-words text-center text-gray-400">
          We've sent a 6-digit code to <span className="text-white font-medium">{email}</span>
        </p>
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength="1"
                ref={(el) => (inputRefs.current[index] = el)}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="h-12 w-10 rounded-lg border border-gray-600 bg-gray-700 text-center text-xl font-bold transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:h-14 sm:w-12 sm:text-2xl"
                required
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg font-bold text-lg transition duration-300 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Login"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Didn't receive the code?{" "}
            <button 
              onClick={handleResend} 
              disabled={timer > 0 || resending}
              className={`font-medium inline-flex items-center gap-2 ${timer > 0 || resending ? "text-gray-500 cursor-not-allowed" : "text-blue-400 hover:underline"}`}
            >
              {resending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-400"></div>
                  Sending...
                </>
              ) : timer > 0 ? (
                `Resend OTP in ${timer}s`
              ) : (
                "Resend OTP"
              )}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
