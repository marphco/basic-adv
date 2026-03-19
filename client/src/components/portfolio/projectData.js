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
import via11 from "../../assets/viasolemio11.jpg"
import via12 from "../../assets/viasolemio12.jpg"
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
 
// ENAV
import enav1 from "../../assets/enav1.jpg"
import enav2 from "../../assets/enav2.jpg"
import enav3 from "../../assets/enav3.jpg"
import enav4 from "../../assets/enav4.jpg"
import enav5 from "../../assets/enav5.jpg"
import enav7 from "../../assets/enav7.jpg"
import enav8 from "../../assets/enav8.jpg"
import enavVideo from "../../assets/enav6.mp4"



const projectData = [
  {
    id: "via-sole-mio",
    images: [via3, via2, via10, via11, via12, via4, via5, via6, via7, via8, via9],
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
    link: null,
  },
  {
    id: "enav",
    images: [enav7, enav1, enav2, enav8, enav3, enav4, enav5],
    video: enavVideo,
    link: null,
  },
  {
    id: "progetto-6",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
];

export default projectData;
