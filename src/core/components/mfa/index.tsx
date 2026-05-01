'use client'
import { useState } from "react";
import { signIn } from "next-auth/react";
import * as React from "react";
import { useParams } from 'next/navigation'
export default function MFA() {
  const [code, setCode] = useState("");
  const params = useParams()
  const orgName = params.instance ?? 'canada'
  const email = sessionStorage.getItem("mfaEmail")
  console.log("####################Email value returned is:",email)

  const verifyOTP = async () => {
    //e.preventDefault()
    
   
    const res = await fetch("/api/mfa", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, email }),
    });

    if (!res.ok) {
      alert("Invalid or expired OTP");
      console.log("MFA Failed")
      return;
    }

      alert("Successfull MFA process. You will get directed to your destination now.");
      console.log("Executing SignIn after MFA Complete")
      sessionStorage.removeItem("mfaEmail");//Clean up after MFA complete
      await signIn("credentials", {
  email: email,
  password: 'foo', //Signing in User happen when the email object is returned. Therefore, password field here should be present(NextAuth's signIn Credentials expect email and password), and  could be anything as it has no effect 
  mfaVerified: true,
  redirectTo: `/${orgName}`,
})

  };

  return (
    
    <div>
      <h2>Enter MFA Code </h2>

      <input
        placeholder="OTP Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button onClick={verifyOTP}>Verify</button>
    </div>
  );
}