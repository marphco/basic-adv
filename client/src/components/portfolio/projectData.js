// src/data/projectData.js
import mockup1 from "../../assets/mockup1.jpg";
import mockup2 from "../../assets/mockup2.jpg";
import mockup3 from "../../assets/mockup3.jpg";
import mockup4 from "../../assets/mockup4.jpg";
import mockup5 from "../../assets/mockup5.jpg";
import mockup6 from "../../assets/mockup6.jpg";
import via10 from "../../assets/viasolemio10.jpg"
import via2 from "../../assets/viasolemio2.jpg"
import via3 from "../../assets/viasolemio3.jpg"
import via4 from "../../assets/viasolemio4.jpg"
import via5 from "../../assets/viasolemio5.jpg"
import via6 from "../../assets/viasolemio6.jpg"
import via7 from "../../assets/viasolemio7.jpg"
import via8 from "../../assets/viasolemio8.jpg"
import via9 from "../../assets/viasolemio9.jpg"
import viaReel from "../../assets/via-reel.mp4"
import fp1 from "../../assets/fp1.jpg"
import fp2 from "../../assets/fp2.jpg"
import fp3 from "../../assets/fp3.jpg"
import fp4 from "../../assets/fp4.png"

// Maison Rulo
import mr1 from "../../assets/mr1.jpg"
import mr2 from "../../assets/mr2.jpg"
import mr3 from "../../assets/mr3.jpg"
import mr4 from "../../assets/mr4.jpg"

// D'Autore
import da1 from "../../assets/da1.jpg"
import da2 from "../../assets/da2.jpg"
import da3 from "../../assets/da3.jpg"
import da4 from "../../assets/da4.jpg"
import dad from "../../assets/dad.jpg"



const projectData = [
  {
    id: "via-sole-mio",
    images: [via10, via2, via3, via4, via5, via6, via7, via8, via9],
    video: viaReel,
    link: "https://viasolemio.com",
  },
  {
    id: "fra-packaging",
    images: [fp1, fp2, fp3, fp4],
    link: "https://frapackaging.com",
  },
  {
    id: "maison-rulo",
    images: [mr1, mr2, mr3, mr4],
    link: null,
  },
  {
    id: "d-autore",
    images: [da1, da2, da3, da4],
    link: "https://dautore.org",
  },
  {
    id: "progetto-5",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: "https://example.com/progetto1",
  },
  {
    id: "progetto-6",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
  {
    id: "progetto-7",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
  {
    id: "progetto-8",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
];

export default projectData;
