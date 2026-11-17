(() => {
  const navigation = document.querySelector(".site-nav");
  if (!navigation) return;

  document.addEventListener("click", event => {
    if (navigation.contains(event.target)) return;
    const expanded = navigation.querySelector("details[open]");
    if (expanded) expanded.open = false;
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const expanded = navigation.querySelector("details[open]");
    if (!expanded) return;
    expanded.open = false;
    if (navigation.contains(document.activeElement)) expanded.querySelector("summary").focus();
  });
})();
