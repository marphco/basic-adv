// src/data/projectData.js
import mockup1 from "../../assets/mockup1.jpg";
import mockup2 from "../../assets/mockup2.jpg";
import mockup3 from "../../assets/mockup3.jpg";
import mockup4 from "../../assets/mockup4.jpg";
import mockup5 from "../../assets/mockup5.jpg";
import mockup6 from "../../assets/mockup6.jpg";

const projectData = {
  Progetto1: {
    title: "Progetto 1",
    description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Natus in eveniet iste. Corporis voluptatibus autem magni voluptates quae eligendi. Nesciunt dolores vero soluta asperiores, natus eos eligendi enim unde ipsam.",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: "https://example.com/progetto1",
  },
  Progetto2: {
    title: "Progetto 2",
    description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Natus in eveniet iste. Corporis voluptatibus autem magni voluptates quae eligendi. Nesciunt dolores vero soluta asperiores, natus eos eligendi enim unde ipsam.",
    images: [mockup1, mockup2, mockup3, mockup4, mockup5, mockup6],
    link: null,
  },
};

export default projectData;
