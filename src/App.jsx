// ✅ Ispravni importi (radi sa novim verzijama jspdf-a)
import "jspdf/dist/polyfills.es.js"; // osigurava da radi sa Unicode
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "bootstrap/dist/css/bootstrap.min.css";
//Unicode podrska za srpska slova

import { initializeApp } from "firebase/app";
import logo from "./images/parkslika2.png";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
  remove,
  update, // ⬅️ DODATO: za batch ažuriranje
} from "firebase/database";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// 🔥 Firebase konfiguracija
const firebaseConfig = {
  apiKey: "AIzaSyC2bs1zXZy1hRlUUfq4O3MOzsO2HdXH9Bg",
  authDomain: "kafic-6c35e.firebaseapp.com",
  projectId: "kafic-6c35e",
  storageBucket: "kafic-6c35e.firebasestorage.app",
  messagingSenderId: "894021595711",
  appId: "1:894021595711:web:a8dedff79f066ed079fe8a",
  measurementId: "G-TW9C8NVX61",
  databaseURL:
    "https://kafic-6c35e-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const App = () => {
	
	

	
	
  const [authLoading, setAuthLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [date, setDate] = useState(formatDate(new Date()));
  const [artikli, setArtikli] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  
  //ZA PRIKAZ RACUNA
  const [showHistory, setShowHistory] = useState(false);
const [formeDatumi, setFormeDatumi] = useState({});
const [selectedDate, setSelectedDate] = useState("");
const [selectedTime, setSelectedTime] = useState("");
const [artikliHistory, setArtikliHistory] = useState([]);
const [formaHistoryData, setFormaHistoryData] = useState(null);

 
  const [editItem, setEditItem] = useState(null);
  // ⏳ Kada je edit mode aktivan → Enter = Sačuvaj
useEffect(() => {
  if (!editItem) return;

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditedItem();
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [editItem]);

  
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [latestObracunTime, setLatestObracunTime] = useState("");



   //tabela za prodato
   const [prodatoInputs, setProdatoInputs] = useState({});







// 🔁 Uvijek prati promjene u "Forma" čvoru za prikaz racuna
useEffect(() => {
  const formaRef = ref(db, "Forma");
  const unsubscribe = onValue(formaRef, (snapshot) => {
    if (snapshot.exists()) {
      setFormeDatumi(snapshot.val());
    } else {
      setFormeDatumi({});
    }
  });
  return () => unsubscribe();
}, []);



// 🔹 Uvijek prati promjene u "Forma" i bira najnoviji datum + vrijeme
useEffect(() => {
  if (!user) return;

  const formaRef = ref(db, "Forma");

  const unsubscribe = onValue(formaRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.val();
    const datumi = Object.keys(data);

    // ✅ sortiraj datume u formatu DD_MM_YYYY
    const sortedDates = datumi.sort((a, b) => {
      const [da, ma, ya] = a.split("_").map(Number);
      const [db, mb, yb] = b.split("_").map(Number);
      const dateA = new Date(ya, ma - 1, da);
      const dateB = new Date(yb, mb - 1, db);
      return dateB - dateA; // najnoviji prvi
    });

    // uzmi najnoviji datum (prvi nakon sortiranja)
    const najnovijiDatumKey = sortedDates[0];
    const vremenaObj = data[najnovijiDatumKey];
    if (!vremenaObj) return;

    // sortiraj vremena po realnom vremenu (HH-MM)
    const vremena = Object.keys(vremenaObj);
    const sortedTimes = vremena.sort((a, b) => {
      const [ha, ma] = a.split("-").map(Number);
      const [hb, mb] = b.split("-").map(Number);
      return hb * 60 + mb - (ha * 60 + ma); // najnovije prvo
    });

    const najnovijeVrijeme = sortedTimes[0];
    const prikazDatuma = najnovijiDatumKey.replaceAll("_", ".");
    const prikazVremena = najnovijeVrijeme.replace("-", ":");

    setLatestObracunTime(`${prikazDatuma} ${prikazVremena}`);
  });

  return () => unsubscribe();
}, [user]);















  // 🧮 Polja ispod tabele
  const [kuhinja, setKuhinja] = useState(0);
  const [dnevnice, setDnevnice] = useState(0);
  const [osoblje, setOsoblje] = useState(0);
  const [kuca, setKuca] = useState(0);
  const [smjena, setSmjena] = useState("");
  const [konobari, setKonobari] = useState("");

  // 🕒 Automatsko osvežavanje datuma
  useEffect(() => {
    const updateDate = () => setDate(formatDate(new Date()));
    updateDate();
    const timer = setInterval(updateDate, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // 🌐 Status konekcije
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionMessage("Ponovo ste konektovani ✅");
      setTimeout(() => setConnectionMessage(""), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionMessage("⚠️ Nema internet konekcije!");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

 
// 🔐 Auth provjera
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      setIsAdmin(currentUser.email.includes("admin"));
    } else {
      setUser(null);
      setIsAdmin(false);
    }

    setAuthLoading(false); // 🔥 ključna linija
  });

  return () => unsubscribe();
}, []);



// 🔁 Uvijek prati promjene u bazi kada je korisnik ulogovan
useEffect(() => {
  if (!user) return;
  const artikliRef = ref(db, "Artikli");
  const unsubscribe = onValue(artikliRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const arr = Object.entries(data).map(([key, val]) => ({
        redni_broj: key,
        ...val,
      }));
      setArtikli(arr);
    } else {
      setArtikli([]);
    }
  });
  
 
  
  

  // 🔒 Prekid osluškivanja kada se korisnik odjavi
  return () => unsubscribe();
}, [user]);





   // 🕓 Učitaj artikle iz izabranog obračuna (Forma/datum/vrijeme) za prikaz racuna
const handleLoadHistory = async (datum, vrijeme) => {
  try {
    const path = `Forma/${datum}/${vrijeme}`;
    const snap = await get(ref(db, path));
    if (snap.exists()) {
      const data = snap.val();
      setFormaHistoryData(data);
      setArtikliHistory(data.artikli || []);
    } else {
      setFormaHistoryData(null);
      setArtikliHistory([]);
    }
  } catch (err) {
    alert("❌ Greška pri učitavanju obračuna: " + err.message);
  }
};



  // ➕ Dodavanje novog artikla
  const [newItem, setNewItem] = useState({
    redni_broj: 1,
    naziv: "",
    jedinica_mjere: "",
    stanje_prethodno: "",
    ubaceno: "",
    ukupno: 0,
    kolicina: "",
    cijena: "",
    vrijednost: 0,
    ostalo: 0,
  });

  // ➕ Dodavanje novog artikla – automatski prvi slobodan ID
  const addNewItem = async () => {
    if (showNewItemForm) {
      setShowNewItemForm(false);
      return;
    }

    try {
      const snapshot = await get(ref(db, "Artikli"));
      let nextId = 1;

      if (snapshot.exists()) {
        const data = snapshot.val();
        const ids = Object.keys(data)
          .map((k) => Number(k))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        for (let i = 1; i <= ids.length + 1; i++) {
          if (!ids.includes(i)) {
            nextId = i;
            break;
          }
        }
      }

      // automatski postavi ID u formu
      setNewItem({
        redni_broj: nextId,
        naziv: "",
        jedinica_mjere: "",
        stanje_prethodno: "",
        ubaceno: "",
        ukupno: 0,
        kolicina: "",
        cijena: "",
        vrijednost: 0,
        ostalo: 0,
      });

      setShowNewItemForm(true);
    } catch (err) {
      alert(`❌ Greška pri određivanju ID-a: ${err.message}`);
    }
  };


const handleDecimalInput = (value, setter) => {
  let val = value.replace(",", ".");

  // ".5" -> "0.5"
  if (/^\.[0-9]*$/.test(val)) {
    val = "0" + val;
  }

  // dozvoli prelazno kucanje  "2", "2.", "2.5"
  if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

  // "2." -> samo prikaz, još nije broj
  if (val.endsWith(".")) {
    setter(val);
    return;
  }

  // validan broj -> šaljemo broj
  setter(val === "" ? "" : Number(val));
};




  // 🔢 Promena inputa (novo i edit forme)
const handleInputChange = (e, field, current, setCurrent) => {
  let val = e.target.value;

  // ✅ Dozvoli prazno polje dok korisnik briše
  if (val === "") {
    setCurrent({ ...current, [field]: "" });
    return;
  }

  // Ako nije broj, prekini
  if (isNaN(val)) return;

  const updated = { ...current, [field]: Number(val) };

  const stanje = Number(updated.stanje_prethodno || 0);
  const ubaceno = Number(updated.ubaceno || 0);
  const kolicina = Number(updated.kolicina || 0);
  const cijena = Number(updated.cijena || 0);

  updated.ukupno = stanje + ubaceno;
  updated.vrijednost = Number((kolicina * cijena).toFixed(2));
  updated.ostalo = updated.ukupno; // zadržavamo tvoju logiku

  setCurrent(updated);
};


  // 💾 Snimi novi artikal (provjera duplikata i automatski ID)
  const saveNewItem = async () => {
    if (!isOnline) {
      alert("❌ Nema internet konekcije!");
      return;
    }

    const nazivTrim = newItem.naziv.trim();
	const cijena=newItem.cijena;
	
	
    if (!nazivTrim) {
      alert("❌ Unesite naziv artikla!");
      return;
    }
	
	
	if (!cijena)
	{
		 alert("❌ Unesite cijenu!");
         return;
	}

    try {
      const snapshot = await get(ref(db, "Artikli"));
      let nextId = 1;

      if (snapshot.exists()) {
        const data = snapshot.val();

        // 🔍 Provjera duplikata po nazivu
        const duplicateName = Object.values(data).some(
          (val) =>
            val.naziv &&
            val.naziv.trim().toLowerCase() === nazivTrim.toLowerCase()
        );

        if (duplicateName) {
          alert("❌ Artikal sa istim nazivom već postoji!");
          return;
        }

        // 🔢 Pronađi najmanji slobodan ID
        const ids = Object.keys(data)
          .map((k) => Number(k))
          .filter((n) => !isNaN(n))
          .sort((a, b) => a - b);

        for (let i = 1; i <= ids.length + 1; i++) {
          if (!ids.includes(i)) {
            nextId = i;
            break;
          }
        }
      }

      // 🔧 Kreiraj novi artikal s novim ID-em
      const itemData = {
        naziv: nazivTrim,
        jedinica_mjere: newItem.jedinica_mjere || "",
        stanje_prethodno: Number(0),
        ubaceno: Number(newItem.ubaceno || 0),
        ukupno: Number(newItem.ukupno || 0),
        kolicina: Number(0),
        cijena: Number(newItem.cijena || 0),
		novo: Number(0),
        vrijednost: Number(0),
	    ostalo: Number(newItem.ubaceno || 0),
        datum_unosa: formatDate(new Date()),
      };

      // 💾 Snimi u bazu
      await set(ref(db, `Artikli/${nextId}`), itemData);

      alert(`✅ Uspješno sačuvan artikal "${nazivTrim}" (ID: ${nextId})`);
      setShowNewItemForm(false);
    } catch (err) {
      alert(`❌ Greška: ${err.message}`);
    }
  };

  
const saveEditedItem = async () => {
  if (!isOnline) {
    alert("❌ Nema internet konekcije!");
    return;
  }

  const trim = (v) => String(v ?? "").trim();
  const nazivTrim = trim(editItem.naziv);
  const jedinicaTrim = trim(editItem.jedinica_mjere);

  // 🔎 INDIVIDUALNE VALIDACIJE (samo što si tražio)
  if (!nazivTrim) {
    alert("❌ Unesite naziv artikla!");
    return;
  }

  // ❗ jedinica_mjere može biti prazna → ne provjerava se

  if (editItem.stanje_prethodno === "") {
    alert("❌ Unesite vrijednost za Stanje iz prethodne smjene!");
    return;
  }

  if (editItem.ubaceno === "") {
    alert("❌ Unesite vrijednost za Ubačeno!");
    return;
  }

  if (editItem.kolicina === "") {
    alert("❌ Unesite vrijednost za Količinu!");
    return;
  }

  if (editItem.cijena === "") {
    alert("❌ Unesite vrijednost za Cijenu!");
    return;
  }

  try {
    // 🔍 Provjeri duplikat naziva (tvoj originalni kod)
    const snapshot = await get(ref(db, "Artikli"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const duplicate = Object.entries(data).some(
        ([key, val]) =>
          String(key) !== String(editItem.redni_broj) &&
          val.naziv &&
          val.naziv.trim().toLowerCase() === nazivTrim.toLowerCase()
      );

      if (duplicate) {
        alert("❌ Artikal sa istim nazivom već postoji!");
        return;
      }
    }

    // ✅ Originalni izračuni i upis u bazu (ništa nisam dirao)
    await set(ref(db, `Artikli/${editItem.redni_broj}`), {
      ...editItem,
      naziv: nazivTrim,
      jedinica_mjere: jedinicaTrim, // može ostati prazno
      stanje_prethodno: Number(editItem.stanje_prethodno) || 0,
      ubaceno: Number(editItem.ubaceno) || 0,
      kolicina: Number(editItem.kolicina) || 0,

 
      cijena: parseFloat(Number(editItem.cijena).toFixed(2)) || 0,
      ukupno: Number(editItem.stanje_prethodno) + Number(editItem.ubaceno),
       vrijednost: parseFloat(
  (Number(editItem.kolicina) * Number(editItem.cijena)).toFixed(2)
) || 0,

ostalo: Number(editItem.stanje_prethodno) + Number(editItem.ubaceno),

    });

    alert(`✅ Artikal "${nazivTrim}" uspješno ažuriran!`);
    setEditItem(null);
  } catch (err) {
    alert(`❌ Greška pri ažuriranju: ${err.message}`);
  }
};

 
 

  // ✂️ Brisanje artikla
  const handleDelete = async (redni_broj, naziv) => {
    if (!window.confirm(`Da li ste sigurni da želite obrisati "${naziv}"?`))
      return;
    try {
      await remove(ref(db, `Artikli/${redni_broj}`));
      alert(`🗑️ Artikal "${naziv}" obrisan!`);
    } catch (err) {
      alert(`❌ Greška: ${err.message}`);
    }
  };

 
 // 🧹 Uklanja srpska slova (č, ć, š, đ, ž)
const removeSerbianLetters = (text) => {
  if (!text) return "";
  return text
    .replace(/č/g, "c")
    .replace(/ć/g, "c")
    .replace(/š/g, "s")
    .replace(/đ/g, "dj")
    .replace(/ž/g, "z")
    .replace(/Č/g, "C")
    .replace(/Ć/g, "C")
    .replace(/Š/g, "S")
    .replace(/Đ/g, "Dj")
    .replace(/Ž/g, "Z");
};

  // 🧾 Export izabranog obračuna u PDF
const handleExportHistoryPDF = () => {
  if (!selectedDate || !selectedTime || !formaHistoryData) {
    alert("❌ Morate odabrati datum i vrijeme obračuna!");
    return;
  }

  // 🔹 Helper za 2 decimale (koristi se samo gdje treba)
  const f2 = (n) => Number(n || 0).toFixed(2);

  try {
    const doc = new jsPDF("p", "pt", "a4", true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const prikazDatum = selectedDate.replaceAll("_", ".");
    const prikazVrijeme = selectedTime.replaceAll("-", ":");

    // 🔹 Naslov
    doc.setFontSize(18);
    doc.text(removeSerbianLetters("Dnevni obračun pića"), 300, 40, { align: "center" });

    // 🔹 Desni ugao — datum + vrijeme
    doc.setFontSize(12);
    doc.text(removeSerbianLetters(`${prikazDatum} ${prikazVrijeme}`), 550, 75, {
      align: "right",
    });

    // 🔹 Priprema podataka
    const artikliArray = formaHistoryData.artikli
      ? Object.values(formaHistoryData.artikli)
      : [];

    // 🔹 Prvi red (glavni naslovi)
    const headRows = [
      [
        { content: "#", rowSpan: 2 },
        { content: removeSerbianLetters("Naziv artikla"), rowSpan: 2 },
        { content: removeSerbianLetters("Jedinica"), rowSpan: 2 },
        { content: removeSerbianLetters("Stanje iz prethodne smjene"), rowSpan: 2 },
        { content: removeSerbianLetters("Novo stanje"), rowSpan: 2 },
        { content: removeSerbianLetters("Ubačeno"), rowSpan: 2 },
        { content: removeSerbianLetters("Ukupno"), rowSpan: 2 },
        { content: removeSerbianLetters("PRODATO"), colSpan: 3, styles: { halign: "center" } },
        { content: removeSerbianLetters("Ostalo"), rowSpan: 2 },
      ],
      [
        removeSerbianLetters("Količina"),
        removeSerbianLetters("Cijena"),
        removeSerbianLetters("Vrijednost"),
      ],
    ];

    // 🔹 BODY — bez zaokruživanja za određena polja
    const bodyRows = artikliArray.map((it) => [
      it.redni_broj || "",
      removeSerbianLetters(it.naziv || ""),
      removeSerbianLetters(it.jedinica_mjere || ""),

      // ❌ BEZ f2 — originalna vrijednost
      it.stanje_prethodno ?? "",
      it.novo ?? "",
      it.ubaceno ?? "",
      it.ukupno ?? "",

      // ❌ Prodato (količina) — BEZ f2
      it.kolicina ?? "",

      // ✔️ Cijena — ostaje f2
      f2(it.cijena),

      // ✔️ Vrijednost — ostaje f2
      f2(it.vrijednost),

      // ❌ Ostalo — BEZ f2
      it.ostalo ?? "",
    ]);

    // 🔹 Kreiraj tabelu
    autoTable(doc, {
      head: headRows,
      body: bodyRows,
      startY: 100,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    });

    // 🔹 Detalji ispod tabele
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(13);
    doc.text(removeSerbianLetters("Detalji obračuna"), 40, finalY);
    doc.setFontSize(11);

    const detalji = [
      `Obračun pića: ${f2(formaHistoryData.ukupno)}`,
      `Kuhinja: ${f2(formaHistoryData.kuhinja)}`,
      `Ukupno: ${f2(formaHistoryData.zbir)}`,
      "",
      `Dnevnice: ${f2(formaHistoryData.dnevnice)}`,
      `Osoblje: ${f2(formaHistoryData.osoblje)}`,
      `Kuća: ${f2(formaHistoryData.kuca)}`,
      `Ukupan rashod: ${f2(
        Number(formaHistoryData.dnevnice || 0) +
        Number(formaHistoryData.osoblje || 0) +
        Number(formaHistoryData.kuca || 0)
      )}`,
      "",
      `Zarada: ${f2(
        Number(formaHistoryData.zbir || 0) -
        Number(formaHistoryData.rashod || 0)
      )}`,
      "",
      `Smjena: ${removeSerbianLetters(formaHistoryData.smjena || "")}`,
      `Konobari: ${removeSerbianLetters(formaHistoryData.konobari || "")}`,
    ];

    detalji.forEach((line, i) => {
      doc.text(removeSerbianLetters(line), 60, finalY + 20 + i * 18);
    });

    // 💾 Sačuvaj PDF
    doc.save(`Obracun_${prikazDatum}_${prikazVrijeme}.pdf`);
  } catch (err) {
    console.error("❌ PDF ERROR:", err);
    alert("❌ Greška pri generisanju PDF-a. Pogledaj konzolu (F12).");
  }
};






// 🧾 Export PDF (trenutno stanje)
const handleExportPDF = () => {
  try {
    const doc = new jsPDF("p", "pt", "a4", true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const prikazVrijeme = latestObracunTime || "N/A";

    // 🔹 Naslov
    doc.setFontSize(18);
    doc.text(
      removeSerbianLetters(`Trenutno stanje – Zadnji obračun (${prikazVrijeme})`),
      300,
      40,
      { align: "center" }
    );

    doc.setFontSize(11);

    // 🔹 Priprema podataka
    const f2 = (n) => Number(n || 0).toFixed(2);

    const artikliArray = artikli || [];

    // 🔹 Header tabele – isti stil kao u historiji
    const headRows = [
      [
        { content: "#", rowSpan: 2 },
        { content: removeSerbianLetters("Naziv artikla"), rowSpan: 2 },
        { content: removeSerbianLetters("Jedinica"), rowSpan: 2 },
        { content: removeSerbianLetters("Stanje iz prethodne smjene"), rowSpan: 2 },
        { content: removeSerbianLetters("Novo stanje"), rowSpan: 2 },
        { content: removeSerbianLetters("Ubačeno"), rowSpan: 2 },
        { content: removeSerbianLetters("Ukupno"), rowSpan: 2 },
        { content: removeSerbianLetters("PRODATO"), colSpan: 3, styles: { halign: "center" } },
        { content: removeSerbianLetters("Ostalo"), rowSpan: 2 },
      ],
      [
        removeSerbianLetters("Količina"),
        removeSerbianLetters("Cijena"),
        removeSerbianLetters("Vrijednost"),
      ],
    ];

    // 🔹 Body
    const bodyRows = artikliArray.map((it) => [
      it.redni_broj,
      removeSerbianLetters(it.naziv || ""),
      removeSerbianLetters(it.jedinica_mjere || ""),
      it.stanje_prethodno ?? "",
      it.novo ?? "",
      it.ubaceno ?? "",
      it.ukupno ?? "",
      it.kolicina ?? "",
      f2(it.cijena),
      f2(it.vrijednost),
      it.ostalo ?? "",
    ]);

    autoTable(doc, {
      head: headRows,
      body: bodyRows,
      startY: 80,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    });

    doc.save(`Trenutno_stanje_${prikazVrijeme}.pdf`);
  } catch (err) {
    console.error("PDF ERROR:", err);
    alert("❌ Greška pri generisanju PDF-a. Pogledaj konzolu (F12).");
  }
};

 
 
 // ⏳ Loading dok Firebase provjerava login sesiju
if (authLoading) {
  return (
    <div className="vh-100 d-flex justify-content-center align-items-center">
      <h3>Učitavanje...</h3>
    </div>
  );
}
 
  // 🔐 Login forma
  if (!user)
    return (
      <div className="container d-flex flex-column align-items-center justify-content-center vh-100">
        <h3 className="mb-3">Prijava</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            signInWithEmailAndPassword(auth, email, password)
              .then(() => alert("Dobrodošli!"))
              .catch((err) => alert(err.message));
          }}
          className="w-50"
        >
          <input
            className="form-control mb-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="form-control mb-2"
            placeholder="Lozinka"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary w-100">Prijavi se</button>
        </form>
      </div>
    );

  return (
    <div className="container-fluid p-0">
      {connectionMessage && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      zIndex: 9999,
      backgroundColor: isOnline ? "green" : "red",
      color: "white",
      textAlign: "center",
      padding: "8px 0",
      fontWeight: "bold",
      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
    }}
  >
    {connectionMessage}
  </div>
)}


      <div
        style={{
          pointerEvents: isOnline ? "auto" : "none",
          opacity: isOnline ? 1 : 0.5,
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
     <div className="d-flex align-items-center">
  <img src={logo} alt="Logo" width="100" className="me-2" />
  <h4
    style={{
      fontWeight: "bold",
      color: "#f22f2f",
      fontFamily: '"Poppins", sans-serif',
      letterSpacing: "1px",
    }}
  >
  
  </h4>
</div>

            <div>
              <button
                onClick={handleExportPDF}
                className="btn btn-outline-secondary mx-1"
              >
                Export u PDF
              </button>
              <button
                onClick={() => signOut(auth)}
                className="btn btn-danger mx-1"
              >
                Odjavi se
              </button>
            </div>
          </div>

          {/* Dugme Dodaj novi artikal */}
          {isAdmin && (
            <div className="mb-3">
              <button className="btn btn-primary" onClick={addNewItem}>
                {showNewItemForm ? "✖ Zatvori formu" : "➕ Dodaj novi artikal"}
              </button>
		
		
{/* 🆕 Forma za novi artikal */}
{showNewItemForm && isAdmin && (
  <div className="card mb-3 p-3 border-primary">
    <h5>🆕 Novi artikal</h5>

    {/* ✅ Omotan za horizontalni scroll (skriven ali aktivan) */}
    <div
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          overflowX: "scroll",
          overflowY: "hidden",
          marginBottom: "-20px",
          paddingBottom: "20px",
        }}
      >
        <div
          className="row g-2 flex-nowrap align-items-start"
          style={{ minWidth: "900px" }}
        >
          {/* ID */}
          <div
            className="col"
            style={{
              minWidth: "80px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label className="form-label fw-bold mb-1">#</label>
            <input className="form-control" value={newItem.redni_broj} readOnly />
          </div>

          {/* Naziv artikla (tekst) */}
          <div
            className="col"
            style={{
              minWidth: "200px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label className="form-label fw-bold mb-1">Naziv</label>
            <input
              type="text"
              className="form-control"
              placeholder="Naziv artikla"
              value={newItem.naziv}
              onChange={(e) =>
                setNewItem({ ...newItem, naziv: e.target.value })
              }
            />
          </div>

          {/* Jedinica mjere (tekst) */}
          <div
            className="col"
            style={{
              minWidth: "150px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label className="form-label fw-bold mb-1">Jedinica</label>
            <input
              type="text"
              className="form-control"
              placeholder="npr. kom, l, kg"
              value={newItem.jedinica_mjere}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  jedinica_mjere: e.target.value,
                })
              }
            />
          </div>

          {/* Ubačeno (broj, bez spinera) */}
          <div
            className="col"
            style={{
              minWidth: "150px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label className="form-label fw-bold mb-1">Ubačeno</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-control"
              placeholder="Ubačeno"
              value={newItem.ubaceno}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                  handleInputChange(
                    { target: { value: val.replace(",", ".") } },
                    "ubaceno",
                    newItem,
                    setNewItem
                  );
                }
              }}
            />
          </div>

          
	
 
 
 {/* Cijena */}
<div
  className="col"
  style={{
    minWidth: "150px",
    display: "flex",
    flexDirection: "column",
  }}
>
  <label className="form-label fw-bold mb-1">Cijena</label>
  <input
    type="text"
    inputMode="decimal"
    className="form-control"
    placeholder="Cijena"
    value={newItem.cijena}
    onChange={(e) => {
      let val = e.target.value;

      // zamijeni zarez u tačku
      val = val.replace(",", ".");

      // 1️⃣ Dozvoli samo kucanje brojeva i eventualne jedne tačke
      if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

      // 2️⃣ Blokiraj nedovršene formate kada pokušamo slati handleru
      // ali dozvoli prikaz u inputu
      if (val === "." || val.endsWith(".")) {
        setNewItem({ ...newItem, cijena: val });
        return;
      }

      // 3️⃣ Ako je valjan broj — pošalji handleru
      handleInputChange(
        { target: { value: val } },
        "cijena",
        newItem,
        setNewItem
      );
    }}
  />
</div>

	
	
	
		  
          {/* Ukupno (readonly) */}
          <div
            className="col"
            style={{
              minWidth: "150px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <label className="form-label fw-bold mb-1">Ukupno</label>
            <input
              readOnly
              className="form-control"
              placeholder="Ukupno"
              value={newItem.ukupno}
            />
          </div>
        </div>
      </div>
    </div>

    <button className="btn btn-success mt-3" onClick={saveNewItem}>
      💾 Sačuvaj artikal
    </button>
  </div>
)


		
		
		
		}

			  
			  
			  
			  
			  
			  
			
{/* 🕓 Pregled prethodnih obračuna */}
<div className="mb-3 mt-3">
  <button
    className="btn btn-secondary"
    onClick={() => setShowHistory((prev) => !prev)}
  >
    {showHistory ? "✖ Zatvori pregled obračuna" : "🕓 Pregled obračuna"}
  </button>
</div>


{showHistory && (
  <div className="card mb-3 p-3 border-info">
    <h5>📅 Pregled sačuvanih obračuna</h5>

    {/* 1️⃣ Izbor datuma */}
    <div className="mb-3">
      <label className="form-label">Odaberite datum:</label>
      <select
        className="form-select"
        value={selectedDate}
        onChange={(e) => {
          setSelectedDate(e.target.value);
          setSelectedTime("");
          setArtikliHistory([]);
        }}
      >
        <option value="">-- Odaberite datum --</option>
      {Object.keys(formeDatumi)
.sort((a, b) => {
  const [da, ma, ya] = a.split("_").map(Number);
  const [db, mb, yb] = b.split("_").map(Number);

  return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
})

  .map((d) => (
    <option key={d} value={d}>
      {d.replaceAll("_", ".")}
    </option>
  ))}
      </select>
    </div>

    {/* 2️⃣ Izbor vremena */}
    {selectedDate && (
      <div className="mb-3">
        <label className="form-label">Odaberite vrijeme:</label>
        <select
          className="form-select"
          value={selectedTime}
          onChange={(e) => {
            setSelectedTime(e.target.value);
            handleLoadHistory(selectedDate, e.target.value);
          }}
        >
          <option value="">-- Odaberite vrijeme --</option>
          {Object.keys(formeDatumi[selectedDate] || {})
            .sort((a, b) => b.localeCompare(a))
            .map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("-", ":")}
              </option>
            ))}
        </select>
      </div>
    )}

  {/* 3️⃣ Tabela istorijskih podataka */}
{artikliHistory.length > 0 ? (
  <div className="table-responsive">
    <table className="table table-bordered table-sm align-middle mt-3">
      <thead className="table-light">
        {/* 🔹 PRVI RED — glavni naslovi */}
        <tr>
          <th rowSpan="2">#</th>
          <th rowSpan="2">Naziv</th>
          <th rowSpan="2">Jedinica</th>
          <th rowSpan="2">Stanje prethodno</th>
          <th rowSpan="2">Novo stanje</th>
          <th rowSpan="2">Ubačeno</th>
          <th rowSpan="2">Ukupno</th>

          {/* 🔹 Glavni naslov za prodato */}
          <th colSpan="3" className="text-center bg-light">
            PRODATO
          </th>

          <th rowSpan="2">Ostalo</th>
        </tr>

        {/* 🔹 DRUGI RED — podnaslovi za kolonu "PRODATO" */}
        <tr>
          <th>Količina</th>
          <th>Cijena</th>
          <th>Vrijednost</th>
        </tr>
      </thead>

      <tbody>
        {artikliHistory.map((it, i) => (
          <tr key={i}>
            <td>{it.redni_broj}</td>
            <td>{it.naziv}</td>
            <td>{it.jedinica_mjere}</td>
            <td>{it.stanje_prethodno}</td>
            <td>{it.novo}</td>
            <td>{it.ubaceno}</td>
            <td>{it.ukupno}</td>
            <td>{it.kolicina}</td>
            <td>{it.cijena}</td>
            <td>{it.vrijednost}</td>
            <td
              style={{
                color: Number(it.ostalo) < 6 ? "red" : "green",
                fontWeight: "bold",
              }}
            >
              {it.ostalo}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
): selectedTime ? (
      <p className="text-muted">📭 Nema artikala za izabrani obračun.</p>
    ) : null}
	
	
	 
{/* 🧮 Dodatni podaci iz obračuna */}
<div className="mt-4 p-3 border rounded bg-light">
  <h6>📘 Detalji obračuna</h6>
  <div className="table-responsive">
    <table className="table table-bordered table-sm text-center align-middle mt-3">
      <thead className="table-light">
        <tr>
          <th>Prihodi</th>
          <th>Rashod</th>
          <th>Zarada</th>
          <th>Smjena / Konobari</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {/* 🟩 1. kolona */}
          <td>
            <div>
              Obračun pića:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.ukupno ?? 0
                  : 0}
              </strong>
            </div>
            <div>
              Kuhinja:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.kuhinja ?? 0
                  : 0}
              </strong>
            </div>
            <div>
              Ukupno:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.zbir ?? 0
                  : 0}
              </strong>
            </div>
          </td>

          {/* 🟦 2. kolona */}
          <td>
            <div>
              Dnevnice:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.dnevnice ?? 0
                  : 0}
              </strong>
            </div>
            <div>
              Osoblje:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.osoblje ?? 0
                  : 0}
              </strong>
            </div>
            <div>
              Kuća:{" "}
              <strong>
                {selectedTime
                  ? formaHistoryData?.kuca ?? 0
                  : 0}
              </strong>
            </div>
            <div>
              Zbir:{" "}
              <strong>
                {selectedTime
                  ? (
                      Number(formaHistoryData?.dnevnice || 0) +
                      Number(formaHistoryData?.osoblje || 0) +
                      Number(formaHistoryData?.kuca || 0)
                    ).toFixed(2)
                  : "0.00"}
              </strong>
            </div>
          </td>

          {/* 🟨 3. kolona */}
          <td>
            <div>
              Zarada:{" "}
              <strong>
                {selectedTime
                  ? (
                      Number(formaHistoryData?.zbir || 0) -
                      Number(formaHistoryData?.rashod || 0)
                    ).toFixed(2)
                  : "0.00"}
              </strong>
            </div>
          </td>

          {/* 🟧 4. kolona */}
          <td>
            <div>
              Smjena:{" "}
              <strong>
                {selectedTime ? formaHistoryData?.smjena ?? "" : ""}
              </strong>
            </div>
            <div>
              Konobari:{" "}
              <strong>
                {selectedTime ? formaHistoryData?.konobari ?? "" : ""}
              </strong>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>









<div className="mt-3 text-center d-flex justify-content-center gap-2">
  <button
    className="btn btn-danger"
    onClick={async () => {
      if (!selectedDate || !selectedTime) {
        alert("Izaberite datum i vrijeme za obračun koji želite da obrišete.");
        return;
      }

      if (!window.confirm("Da li ste sigurni da želite obrisati ovaj obračun?")) {
        return;
      }

      try {
        const dateRef = ref(db, `Forma/${selectedDate}/${selectedTime}`);
        await remove(dateRef);

        const snapshot = await get(ref(db, `Forma/${selectedDate}`));
        if (!snapshot.exists() || Object.keys(snapshot.val() || {}).length === 0) {
          await remove(ref(db, `Forma/${selectedDate}`));
        }

        const prikazDatum = selectedDate.replaceAll("_", ".");
        const prikazVrijeme = selectedTime.replaceAll("-", ":");

        alert(`✅ Uspješno ste obrisali obračun za ${prikazDatum} u ${prikazVrijeme}.`);

        setSelectedTime("");
        setArtikliHistory([]);
      } catch (error) {
        console.error("Greška prilikom brisanja:", error);
        alert("❌ Došlo je do greške prilikom brisanja obračuna.");
      }
    }}
  >
    🗑️ Obriši obračun
  </button>

  {/* 🧾 Export to PDF dugme */}
  <button
    className="btn btn-outline-primary"
    onClick={handleExportHistoryPDF}
  >
    📄 Sačuvaj PDF
  </button>
</div>



 




	
  </div>
)}
 
			
			
			
			


			
			  
			  
			  
			  
            </div>
          )



}

		 
		 

         

    <h4>
  Trenutno stanje – Zadnji obračun {" "}
  {latestObracunTime ? `(${latestObracunTime})` : "(učitavanje...)"}
</h4>
      
	
	
	{/* 📋 Tabela sa podacima iz Firebase (bez lokalnih proračuna) */}
<div className="table-responsive">
  <table className="table table-bordered table-sm align-middle">
    <thead className="table-light">
      {/* PRVI RED — glavni naslovi */}
      <tr>
        <th rowSpan="2">#</th>
        <th rowSpan="2">Naziv artikla</th>
        <th rowSpan="2">Jedinica</th>
        <th rowSpan="2">Stanje iz prethodne smjene</th>
        <th rowSpan="2">Novo stanje</th>
        <th rowSpan="2">Ubačeno</th>
        <th rowSpan="2">Ukupno</th>

        {/* 🔹 "PRODATO" se proteže preko 3 kolone */}
        <th colSpan="3" className="text-center bg-light">
          PRODATO
        </th>

        <th rowSpan="2">Ostalo</th>
        {isAdmin && <th rowSpan="2">Akcija</th>}
      </tr>

      {/* DRUGI RED — podnaslovi ispod "PRODATO" */}
      <tr>
        <th>Količina</th>
        <th>Cijena</th>
        <th>Vrijednost</th>
      </tr>
    </thead>

<tbody>
  {artikli.length > 0 ? (
    artikli.map((item) => {
      const isEditing = editItem && editItem.redni_broj === item.redni_broj;
      return (
        <tr key={item.redni_broj}>
          <td>{item.redni_broj}</td>

          {/* Naziv */}
          <td>
            {isEditing ? (
              <input
                type="text"
                className="form-control form-control-sm"
                value={editItem.naziv}
                onChange={(e) =>
                  setEditItem({ ...editItem, naziv: e.target.value })
                }
              />
            ) : (
              item.naziv
            )}
          </td>

          {/* Jedinica mjere */}
          <td>
            {isEditing ? (
              <input
                type="text"
                className="form-control form-control-sm"
                value={editItem.jedinica_mjere}
                onChange={(e) =>
                  setEditItem({
                    ...editItem,
                    jedinica_mjere: e.target.value,
                  })
                }
              />
            ) : (
              item.jedinica_mjere
            )}
          </td>

          {/* Stanje prethodno */}
          <td>
            {isEditing ? (
              <input
                type="text"
                inputMode="numeric"
                className="form-control form-control-sm"
                value={editItem.stanje_prethodno}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                    handleInputChange(
                      { target: { value: val.replace(",", ".") } },
                      "stanje_prethodno",
                      editItem,
                      setEditItem
                    );
                  }
                }}
              />
            ) : (
              item.stanje_prethodno
            )}
          </td>

          {/* Novo stanje */}
          <td>{item.novo}</td>

          {/* Ubaceno */}
          <td>
            {isEditing ? (
              <input
                type="text"
                inputMode="numeric"
                className="form-control form-control-sm"
                value={editItem.ubaceno}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                    handleInputChange(
                      { target: { value: val.replace(",", ".") } },
                      "ubaceno",
                      editItem,
                      setEditItem
                    );
                  }
                }}
              />
            ) : (
              item.ubaceno
            )}
          </td>

          {/* Ukupno */}
          <td>{isEditing ? editItem.ukupno : item.ukupno}</td>

          {/* Količina */}
          <td>
            {isEditing ? (
              <input
                type="text"
                inputMode="numeric"
                className="form-control form-control-sm"
                value={editItem.kolicina}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[0-9]*[.,]?[0-9]*$/.test(val)) {
                    handleInputChange(
                      { target: { value: val.replace(",", ".") } },
                      "kolicina",
                      editItem,
                      setEditItem
                    );
                  }
                }}
              />
            ) : (
              item.kolicina
            )}
          </td>
{/* Cijena */}
<td>
  {isEditing ? (
    <input
      type="text"
      inputMode="decimal"
      className="form-control form-control-sm"
      value={editItem.cijena}
      onChange={(e) => {
        let val = e.target.value;

        // 1) Zamijeni zarez u tačku
        val = val.replace(",", ".");

        // 2) Ako počinje tačkom → pretvori u 0.x
        if (/^\.[0-9]*$/.test(val)) {
          val = "0" + val;
        }

        // 3) DOZVOLI faze kucanja: 2 , 2. , 2.5 
        if (!/^[0-9]*\.?[0-9]*$/.test(val)) return;

        // 4) Ako završava tačkom → nemoj još slati u handler
        if (val.endsWith(".")) {
          setEditItem({ ...editItem, cijena: val });
          return;
        }

        // 5) Sada je valjan broj → šaljemo u handler
        handleInputChange(
          { target: { value: val } },
          "cijena",
          editItem,
          setEditItem
        );
      }}
    />
  ) : (
    item.cijena
  )}
</td>


          {/* Vrijednost */}
          <td>{isEditing ? editItem.vrijednost : item.vrijednost}</td>

          {/* Ostalo */}
          <td
            style={{
              color: Number(item.ostalo) < 6 ? "red" : "green",
              fontWeight: "bold",
            }}
          >
            {isEditing ? editItem.ostalo : item.ostalo}
          </td>

          {/* Akcija */}
          {isAdmin && (
            <td className="text-center" style={{ whiteSpace: "nowrap" }}>
              <div className="d-flex justify-content-center align-items-center flex-nowrap">
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-sm btn-success me-2"
                      onClick={saveEditedItem}
                    >
                      💾 Sačuvaj
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditItem(null)}
                    >
                      ✖ Odustani
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-warning me-2"
                      onClick={() => setEditItem({ ...item })}
                    >
                      ✏️ Uredi
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() =>
                        handleDelete(item.redni_broj, item.naziv)
                      }
                    >
                      🗑️ Obriši
                    </button>
                  </>
                )}
              </div>
            </td>
          )}
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan={isAdmin ? 12 : 11} className="text-center">
        Nema artikala za prikaz.
      </td>
    </tr>
  )}
</tbody>

   
   
   
  </table>
</div>

	
	
	  

{/* 📊 Ispod tabele — forma obračuna */}
<div className="mt-4 p-3 border rounded bg-light">
  <div className="row g-2">
 

     
 

  

   

    
 

   
 

   
  </div>



 



{/* 🆕 NOVA TABELA – Prodato/Dodato */}
<div className="mt-5 p-3 border rounded bg-light">
  <h5>📊 Unos obračuna</h5>
  <table className="table table-bordered table-sm align-middle mt-3">
    <thead className="table-light">
      <tr>
        <th style={{ width: "60px" }}>#</th>
        <th>Ime artikla</th>
        <th style={{ width: "150px" }}>Prodato</th>
        <th style={{ width: "150px" }}>Dodaj</th>
      </tr>
    </thead>
    <tbody>
      {artikli.length > 0 ? (
        artikli.map((a) => (
          <tr key={a.redni_broj}>
            <td>{a.redni_broj}</td>
            <td>{a.naziv}</td>
   
   
   
   {/* PRODATO */}
<td>
  <input
    inputMode="numeric"
    pattern="[0-9]*"
    min="0"
    className="form-control form-control-sm"
    value={prodatoInputs[a.redni_broj]?.prodato ?? ""}
    onChange={(e) => {
      const val = e.target.value;
      if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
        setProdatoInputs((prev) => ({
          ...prev,
          [a.redni_broj]: {
            ...prev[a.redni_broj],
            prodato: val === "" ? "" : Number(val),
          },
        }));
      }
    }}
    disabled={!isAdmin && false ? true : false}
  />
</td>

{/* DODATO */}
<td>
  <input
    inputMode="numeric"
    pattern="[0-9]*"
    min="0"
    className="form-control form-control-sm"
    value={prodatoInputs[a.redni_broj]?.dodato ?? ""}
    onChange={(e) => {
      const val = e.target.value;
      if (val === "" || (!isNaN(val) && Number(val) >= 0)) {
        setProdatoInputs((prev) => ({
          ...prev,
          [a.redni_broj]: {
            ...prev[a.redni_broj],
            dodato: val === "" ? "" : Number(val),
          },
        }));
      }
    }}
    disabled={!isAdmin}
  />
</td>

   
   
   
   
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="4" className="text-center">
            Nema artikala u bazi.
          </td>
        </tr>
      )}
    </tbody>
  </table>



 
 {/* 🆕 Polja za unos dodatnih podataka */}
<div className="row g-2 mt-4">

  {/* KUHINJA */}
  <div className="col-md-2">
    <label>Kuhinja</label>
    <input
      type="text"
      inputMode="decimal"
      className="form-control"
      placeholder="Zarada od kuhinje"
      value={kuhinja === 0 ? "" : kuhinja}
      onChange={(e) => handleDecimalInput(e.target.value, setKuhinja)}
    />
  </div>

  {/* DNEVNICE */}
  <div className="col-md-2">
    <label>Dnevnice</label>
    <input
      type="text"
      inputMode="decimal"
      className="form-control"
      placeholder="Dnevnice"
      value={dnevnice === 0 ? "" : dnevnice}
      onChange={(e) => handleDecimalInput(e.target.value, setDnevnice)}
    />
  </div>

  {/* OSOBLJE */}
  <div className="col-md-2">
    <label>Osoblje</label>
    <input
      type="text"
      inputMode="decimal"
      className="form-control"
      placeholder="Osoblje"
      value={osoblje === 0 ? "" : osoblje}
      onChange={(e) => handleDecimalInput(e.target.value, setOsoblje)}
    />
  </div>

  {/* KUĆA */}
  <div className="col-md-2">
    <label>Kuća</label>
    <input
      type="text"
      inputMode="decimal"
      className="form-control"
      placeholder="Kuća"
      value={kuca === 0 ? "" : kuca}
      onChange={(e) => handleDecimalInput(e.target.value, setKuca)}
    />
  </div>

  {/* SMJENA (NE DIRAMO) */}
  <div className="col-md-2">
    <label>Smjena</label>
    <input
      type="text"
      className="form-control"
      placeholder="npr. I-smjena"
      value={smjena}
      onChange={(e) => setSmjena(e.target.value)}
    />
  </div>

  {/* KONOBARI (NE DIRAMO) */}
  <div className="col-md-2">
    <label>Konobari</label>
    <input
      type="text"
      className="form-control"
      placeholder="npr. Selmir, Haris"
      value={konobari}
      onChange={(e) => setKonobari(e.target.value)}
    />
  

 
  </div>
</div>





  {/* Dugme SAVE */}
  <button
    className="btn btn-success mt-3"
 
onClick={async () => {
  if (!window.confirm("Da li ste sigurni da želite da sačuvate obračun?"))
    return;

  try {
    const snap = await get(ref(db, "Artikli"));
    if (!snap.exists()) {
      alert("❌ Nema artikala u bazi!");
      return;
    }

    const data = snap.val();
    const updates = {};
    let ukupno = 0;

    // 📦 1️⃣ Pripremi Artikle i računaj ukupno
    const artikliObj = {};


/*
    Object.entries(data).forEach(([key, val]) => {
      const unos = prodatoInputs[key] || {};
      const prodato = Number(unos.prodato) || 0;
      const dodato = Number(unos.dodato) || 0;
      const cijena = Number(val.cijena) || 0;

      ukupno += Number((prodato * cijena).toFixed(2));
      // sabiramo vrijednost prodatih artikala

      let novo = Number(val.ostalo) || 0;
      let stanje_prethodno = Number(val.stanje_prethodno) || 0;
      let ubaceno = Number(val.ubaceno) || 0;

      // --- PRODATO ---
      const kolicina = prodato;
      const vrijednost = Number((kolicina * cijena).toFixed(2));
      stanje_prethodno = stanje_prethodno - kolicina;
      let ukupnoNovo = stanje_prethodno + ubaceno;
      let ostalo = ukupnoNovo - kolicina;

      // --- DODATO ---
      stanje_prethodno = stanje_prethodno + ubaceno;
      ubaceno = dodato;
      ukupnoNovo = stanje_prethodno + ubaceno;
      ostalo = ukupnoNovo;

      // 📘 Artikli za glavni čvor
      updates[`Artikli/${key}/kolicina`] = kolicina;
      updates[`Artikli/${key}/vrijednost`] = vrijednost;
      updates[`Artikli/${key}/stanje_prethodno`] = stanje_prethodno;
      updates[`Artikli/${key}/ubaceno`] = ubaceno;
      updates[`Artikli/${key}/ukupno`] = ukupnoNovo;
      updates[`Artikli/${key}/ostalo`] = ostalo;
      updates[`Artikli/${key}/novo`] = novo;

      // 📘 Artikli i za Forma/{datum}/{vrijeme}/artikli
      artikliObj[key] = {
        ...val,
        kolicina,
        vrijednost,
        stanje_prethodno,
        ubaceno,
        ukupno: ukupnoNovo,
        ostalo,
        novo,
      };
    });
	
	*/
	
	
	Object.entries(data).forEach(([key, val]) => {
  const unos = prodatoInputs[key] || {};
  const prodato = Number(unos.prodato) || 0;
  const dodato = Number(unos.dodato) || 0;
  const cijena = Number(val.cijena) || 0;

  // Stanje prije ove smjene
  const stanje_prethodno = Number(val.ostalo) || 0;

  // Prodano i vrijednost prodaje
  const kolicina = prodato;
  const vrijednost = Number((kolicina * cijena).toFixed(2));

  // Novo stanje nakon prodaje i dodavanja
  const novo_stanje = stanje_prethodno - prodato + dodato;

  // Ažuriranje za Firebase
  updates[`Artikli/${key}/kolicina`] = kolicina;
  updates[`Artikli/${key}/vrijednost`] = vrijednost;
  updates[`Artikli/${key}/stanje_prethodno`] = stanje_prethodno;
  updates[`Artikli/${key}/ubaceno`] = dodato;
  updates[`Artikli/${key}/ukupno`] = novo_stanje;
  updates[`Artikli/${key}/ostalo`] = novo_stanje;

  // Artikli za Forma/{datum}/{vrijeme}/artikli
  artikliObj[key] = {
    ...val,
    kolicina,
    vrijednost,
    stanje_prethodno,
    ubaceno: dodato,
    ukupno: novo_stanje,
    ostalo: novo_stanje,
    novo: val.ostalo, // ili ako želiš, može biti stanje prije ove smjene
  };
});


    // 🧮 2️⃣ Izračunavanje finansijskih podataka
    const kuhinjaVal = Number(kuhinja) || 0;
    const dnevniceVal = Number(dnevnice) || 0;
    const osobljeVal = Number(osoblje) || 0;
    const kucaVal = Number(kuca) || 0;

    const zbir = Number((ukupno + kuhinjaVal).toFixed(2));
    const rashod = Number((dnevniceVal + osobljeVal + kucaVal).toFixed(2));
    const zarada = Number((zbir - rashod).toFixed(2));


    // 📅 3️⃣ Kreiranje putanje Forma/{datum}/{vrijeme}
    const now = new Date();
    const safeDate = formatDate(now).replaceAll(".", "_");
    const vrijeme = now
      .toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })
      .replaceAll(":", "-");
    const basePath = `Forma/${safeDate}/${vrijeme}`;

    // 📘 4️⃣ Dodaj sve u update batch
    updates[`${basePath}/artikli`] = artikliObj;
    updates[`${basePath}/ukupno`] = ukupno;
    updates[`${basePath}/kuhinja`] = kuhinjaVal;
    updates[`${basePath}/zbir`] = zbir;
    updates[`${basePath}/dnevnice`] = dnevniceVal;
    updates[`${basePath}/osoblje`] = osobljeVal;
    updates[`${basePath}/kuca`] = kucaVal;
    updates[`${basePath}/rashod`] = rashod;
    updates[`${basePath}/zarada`] = zarada;
    updates[`${basePath}/smjena`] = smjena || "";
    updates[`${basePath}/konobari`] = konobari || "";

    // 🔥 5️⃣ Upis u bazu (sve ili ništa)
    await update(ref(db), updates);

    // ✅ Ako je uspjelo — resetuj sve unose
    setProdatoInputs({});
    setKuhinja(0);
    setDnevnice(0);
    setOsoblje(0);
    setKuca(0);
    setSmjena("");
    setKonobari("");

    alert("✅ Uspješno sačuvan obračun!");
  } catch (err) {
    alert(`❌ Greška: ${err.message}`);
  }
}

 
 
 
 
 }
  >
    💾 Sačuvaj obračun final
  </button>

  
  
  
  
</div>

</div>

      
        </div>
      </div>
    </div>
  );
};

export default App;
