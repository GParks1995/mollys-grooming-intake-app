// src/App.js

import React, { useState } from "react";
import breedPricing from "./data/breedPricing";
import addOns from "./data/addOns";
import emailjs from "emailjs-com"; // npm install emailjs-com

const GINGR_SIGNUP_URL = "https://mollysdogcare.portal.gingrapp.com/#/public/new_customer";
const STAFF_EMAIL = "gparks@mollysdogcare.com";
const SHEET_WEBHOOK_URL = "YOUR_ZAPIER_WEBHOOK_URL"; // Replace with your Zapier webhook

const mollysColors = {
  purple: "#6c51b0",
  cream: "#fffaf5",
  grey: "#f0f0f0",
};

function App() {
  const [step, setStep] = useState(0);
  const [hasAccount, setHasAccount] = useState(null);
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState("");
  const [service, setService] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [total, setTotal] = useState(0);
  const [clientInfo, setClientInfo] = useState({
    ownerName: "", dogName: "", phone: "", email: "", preferredDate: "", notes: "", vaccines: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: Account verification
  if (step === 0) {
    return (
      <div style={{ background: mollysColors.purple, color: "#fff", minHeight: "100vh", padding: 32, textAlign: "center" }}>
        <img src="/logo.png" alt="Molly's Logo" style={{ maxWidth: 90, marginBottom: 15 }} />
        <h1>Welcome to Molly’s Grooming Estimate</h1>
        <p style={{fontSize:"1.2em"}}>Do you already have a Molly’s Gingr account?</p>
        <button onClick={() => { setHasAccount(true); setStep(1); }} style={{margin:10, padding:12, fontSize:"1em", background:"#fff", color:mollysColors.purple, borderRadius:9, border:"none"}}>Yes</button>
        <button onClick={() => setHasAccount(false)} style={{margin:10, padding:12, fontSize:"1em", background:"#fff", color:mollysColors.purple, borderRadius:9, border:"none"}}>No</button>
        {!hasAccount && hasAccount !== null && (
          <div style={{marginTop:30, background:mollysColors.cream, color:mollysColors.purple, padding:24, borderRadius:15, display:"inline-block"}}>
            <p>You'll need a Molly's Gingr account to request a groom.</p>
            <a href={GINGR_SIGNUP_URL} target="_blank" rel="noopener noreferrer" style={{color:mollysColors.purple, fontWeight:700}}>Create your account here</a>
            <br/><br/><button onClick={()=>setHasAccount(null)} style={{marginTop:10}}>Back</button>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Breed, size, service
  if (step === 1) {
    return (
      <div style={{ background: mollysColors.cream, minHeight: "100vh", padding: 32 }}>
        <h2 style={{ color: mollysColors.purple }}>Tell us about your pup</h2>
        <label>Breed: <br />
          <select value={breed} onChange={e => setBreed(e.target.value)}>
            <option value="">Select breed</option>
            {breedPricing.map((b, idx) => <option key={idx} value={b.breed}>{b.breed}</option>)}
          </select>
        </label>
        <br /><br />
        <label>Size: <br />
          <select value={size} onChange={e => setSize(e.target.value)}>
            <option value="">Select size</option>
            <option value="Small">Small (0-20 lbs)</option>
            <option value="Medium">Medium (21-50 lbs)</option>
            <option value="Large">Large (51+ lbs)</option>
          </select>
        </label>
        <br /><br />
        <label>Service: <br />
          <select value={service} onChange={e => setService(e.target.value)}>
            <option value="">Select service</option>
            <option value="Bath & Brush">Bath & Brush</option>
            <option value="Bath & Tidy">Bath & Tidy</option>
            <option value="Cut & Style">Cut & Style</option>
          </select>
        </label>
        <br /><br />
        <button disabled={!(breed && size && service)} onClick={() => {
          // Lookup price
          const breedObj = breedPricing.find(b => b.breed === breed);
          let price = 0;
          if (breedObj && breedObj.sizes[size] && breedObj.sizes[size][service])
            price = breedObj.sizes[size][service];
          setBasePrice(price);
          setTotal(price);
          setStep(2);
        }}>Next</button>
      </div>
    );
  }

  // Step 3: Show price, pick add-ons
  if (step === 2) {
    return (
      <div style={{ background: mollysColors.cream, minHeight: "100vh", padding: 32 }}>
        <h2 style={{ color: mollysColors.purple }}>{clientInfo.dogName ? clientInfo.dogName : "Your pup"}'s estimate</h2>
        <div style={{ fontSize: "1.2em", marginBottom: "1em" }}>
          <b>Base price:</b> ${basePrice} for {breed} ({size}) - {service}
        </div>
        <div>
          <b>Add extras (optional):</b>
          <ul>
            {addOns.map((a, idx) => (
              <li key={idx}>
                <label>
                  <input type="checkbox"
                    checked={selectedAddOns.includes(a.name)}
                    onChange={e => {
                      let adds = [...selectedAddOns];
                      let runningTotal = basePrice;
                      if (e.target.checked) adds.push(a.name);
                      else adds = adds.filter(an => an !== a.name);
                      adds.forEach(name => {
                        const ao = addOns.find(z => z.name === name);
                        if (ao) runningTotal += ao.price;
                      });
                      setSelectedAddOns(adds);
                      setTotal(runningTotal);
                    }}
                  /> {a.name} (+${a.price})
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div style={{margin:"1em 0",fontSize:"1.3em"}}><b>Total estimate: ${total}</b></div>
        <button onClick={() => setStep(3)}>Next</button>
        <button style={{marginLeft:12}} onClick={() => setStep(1)}>Back</button>
      </div>
    );
  }

  // Step 4: Collect info and submit
  if (step === 3) {
    return (
      <div style={{ background: mollysColors.cream, minHeight: "100vh", padding: 32 }}>
        <h2 style={{ color: mollysColors.purple }}>Final details</h2>
        <form onSubmit={async e => {
          e.preventDefault();
          setSubmitting(true);
          // Send to EmailJS (requires your EmailJS keys)
          const templateParams = {
            ...clientInfo, breed, size, service, basePrice, selectedAddOns: selectedAddOns.join(", "), total
          };
          try {
            await emailjs.send(
              'YOUR_SERVICE_ID', // replace with your EmailJS service ID
              'YOUR_TEMPLATE_ID', // replace with your EmailJS template ID
              templateParams,
              'YOUR_USER_ID'      // replace with your EmailJS user ID
            );
            // Optionally send to Google Sheets via Zapier webhook
            fetch(SHEET_WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(templateParams) });
            setSubmitting(false);
            setSubmitted(true);
            setStep(4);
          } catch (err) {
            setSubmitting(false);
            alert("There was an error submitting your request. Please try again or call the front desk.");
          }
        }}>
          <label>Owner Name:<br/><input required value={clientInfo.ownerName} onChange={e=>setClientInfo({...clientInfo, ownerName:e.target.value})}/></label><br/><br/>
          <label>Dog Name:<br/><input required value={clientInfo.dogName} onChange={e=>setClientInfo({...clientInfo, dogName:e.target.value})}/></label><br/><br/>
          <label>Phone:<br/><input required value={clientInfo.phone} onChange={e=>setClientInfo({...clientInfo, phone:e.target.value})}/></label><br/><br/>
          <label>Email:<br/><input required type="email" value={clientInfo.email} onChange={e=>setClientInfo({...clientInfo, email:e.target.value})}/></label><br/><br/>
          <label>Preferred date/time (optional):<br/><input value={clientInfo.preferredDate} onChange={e=>setClientInfo({...clientInfo, preferredDate:e.target.value})}/></label><br/><br/>
          <label>Special notes:<br/><textarea value={clientInfo.notes} onChange={e=>setClientInfo({...clientInfo, notes:e.target.value})}/></label><br/><br/>
          <label>
            <input type="checkbox" required checked={clientInfo.vaccines} onChange={e=>setClientInfo({...clientInfo, vaccines:e.target.checked})}/>
            My dog is up to date on Rabies, Bordetella, and Distemper vaccines (with 48-hr wait after last shot)
          </label><br/><br/>
          <button disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button>
        </form>
        <button style={{marginTop:12}} onClick={()=>setStep(2)}>Back</button>
      </div>
    );
  }

  // Step 5: Confirmation
  if (step === 4 && submitted) {
    return (
      <div style={{ background: mollysColors.purple, color: "#fff", minHeight: "100vh", padding: 32, textAlign: "center" }}>
        <h1>Thank you!</h1>
        <p>Your grooming request has been sent to our front desk. We’ll be in touch soon to confirm and schedule your appointment!</p>
        <a href="/" style={{color:"#fff",textDecoration:"underline"}}>Start a new request</a>
      </div>
    );
  }

  return null;
}

export default App;
