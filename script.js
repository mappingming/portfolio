const categories = ["All", "GIS", "Visualization", "Code", "AI Apps"];

const projectsData = [
  {
    title: "Liquor Retail Interactive Map (Re-creation)",
    img: "OntarioBeerMap.jpg",
    url: "https://mappingming.github.io/beerMap-Ontario/",
    description:
      "A custom map migrating the entire application from Mapbox GL JS to the Esri ArcGIS Maps SDK for JavaScript",
    tags: ["GIS", "Visualization", "Code"],
  },
  {
    title: "Childcare Deserts in Toronto",
    img: "childcareDesert.png",
    url: "https://mappingming.github.io/portfolio/projects/blog/childcare-desert/",
    description:
      "A spatial analysis of Toronto's childcare deserts that maps where daycare supply falls short of demand and tests real-world walkability.",
    tags: ["GIS", "Visualization", "Code"],
  },
  {
    title: "Green Space Analysis",
    img: "workInProgress.png",
    url: "",
    description: "🟡 In progress",
    tags: ["GIS", "Visualization"],
  },
];

const projectContainer = document.getElementById("projects");
const tagContainer = document.getElementById("tagContainer");

let activeTag = "All";

function renderProjects() {
  projectContainer.innerHTML = "";

  projectsData.forEach((project) => {
    const matchesTag = activeTag === "All" || project.tags.includes(activeTag);

    if (matchesTag) {
      const div = document.createElement("div");
      div.className = "project";

      const fileName = project.img.toLowerCase().replace(/\s+/g, "-");
      const imgUrl = `img/${fileName}`;

      div.innerHTML = `
      <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="project-card-link">  
        <img src="${imgUrl}" alt="${project.title}" />
          <div class="project-content">
            <div class="project-title">${project.title}</div>
            <div class="project-desc">${project.description}</div>
          </div>
      </a>
      `;

      projectContainer.appendChild(div);
    }
  });
}

function renderTags() {
  categories.forEach((tag) => {
    const div = document.createElement("div");
    div.className = "tag";
    div.innerText = tag;

    if (tag === activeTag) {
      div.classList.add("active");
    }

    div.onclick = () => {
      activeTag = tag;
      document
        .querySelectorAll(".tag")
        .forEach((t) => t.classList.remove("active"));
      div.classList.add("active");
      renderProjects();
    };

    tagContainer.appendChild(div);
  });
}

renderTags();
renderProjects();
