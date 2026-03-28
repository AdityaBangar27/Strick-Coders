function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}

window.onclick = function(e) {
  if (!e.target.closest('.profile')) {
    document.getElementById("menu").style.display = "none";
  }
}

function toggleMode() {
  document.body.classList.toggle("dark");
}