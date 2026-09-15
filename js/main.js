(() => {
  // 集中取得頁面中的互動元件，讓同一支腳本可支援所有頁面。
  const toggles = document.querySelectorAll("[data-menu-toggle]");
  const searchToggles = document.querySelectorAll("[data-search-toggle]");
  const carousels = document.querySelectorAll("[data-carousel]");

  // 初始化首頁輪播與鍵盤操作。
  carousels.forEach((carousel) => {
    const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
    const indicators = Array.from(
      carousel.querySelectorAll("[data-carousel-indicator]"),
    );
    const previousButton = carousel.querySelector("[data-carousel-previous]");
    const nextButton = carousel.querySelector("[data-carousel-next]");

    if (
      slides.length === 0 ||
      slides.length !== indicators.length ||
      !previousButton ||
      !nextButton
    ) {
      // 輪播結構不完整時略過，避免影響頁面中的其他互動功能。
      return;
    }

    let currentIndex = slides.findIndex((slide) =>
      slide.classList.contains("is-current"),
    );

    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const showSlide = (nextIndex) => {
      // 讓超出範圍的索引回到輪播首尾，支援循環切換。
      currentIndex = (nextIndex + slides.length) % slides.length;

      slides.forEach((slide, index) => {
        const isCurrent = index === currentIndex;
        slide.classList.toggle("is-current", isCurrent);
        slide.setAttribute("aria-hidden", String(!isCurrent));
      });

      indicators.forEach((indicator, index) => {
        const isCurrent = index === currentIndex;
        indicator.classList.toggle("is-current", isCurrent);
        indicator.setAttribute("aria-pressed", String(isCurrent));
      });
    };

    indicators.forEach((indicator, index) => {
      indicator.addEventListener("click", () => {
        showSlide(index);
      });
    });

    previousButton.addEventListener("click", () => {
      showSlide(currentIndex - 1);
    });

    nextButton.addEventListener("click", () => {
      showSlide(currentIndex + 1);
    });

    carousel.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea, select")) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showSlide(currentIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showSlide(currentIndex + 1);
      }
    });

    showSlide(currentIndex);
  });

  // 初始化行動版導覽選單。
  toggles.forEach((toggle) => {
    const navigationId = toggle.getAttribute("aria-controls");
    const navigation = document.getElementById(navigationId);

    if (!navigation) {
      return;
    }

    const closeMenu = () => {
      toggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", () => {
      const willOpen = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(willOpen));
      navigation.classList.toggle("is-open", willOpen);
      document.body.classList.toggle("menu-open", willOpen);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      // 回到桌面寬度時收合選單，避免保留行動版的開啟狀態。
      if (window.innerWidth > 768) {
        closeMenu();
      }
    });
  });

  // 初始化站內搜尋面板，僅在送出後更新搜尋結果。
  searchToggles.forEach((toggle) => {
    const panelId = toggle.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);

    if (!panel) {
      return;
    }

    const form = panel.matches("[data-search-form]") ? panel : null;
    const input = panel.querySelector("[data-search-input]");
    const closeButton = panel.querySelector("[data-search-close]");
    const summary = panel.querySelector("[data-search-summary]");
    const emptyPage = document.querySelector("[data-search-empty-page]");
    const items = Array.from(document.querySelectorAll("[data-search-item]"));

    if (!form || !input || !closeButton || !summary || !emptyPage) {
      return;
    }

    // 統一搜尋文字格式，避免大小寫與前後空白影響比對。
    const normalize = (value) => value.toLocaleLowerCase("zh-Hant").trim();

    const openSearch = () => {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      summary.textContent = `可搜尋 ${items.length} 項內容`;
      input.focus();
    };

    const closeSearch = () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      input.value = "";
      toggle.focus();
    };

    const submitSearch = (event) => {
      event.preventDefault();

      const query = normalize(input.value);

      if (query === "") {
        summary.textContent = "請輸入搜尋關鍵字";
        input.focus();
        return;
      }

      const matches = items.filter((item) =>
        normalize(item.textContent).includes(query),
      );
      const hasMatches = matches.length > 0;
      const matchedItems = new Set(matches);

      items.forEach((item) => {
        // 空結果頁會隱藏原內容，因此先還原項目，避免下次搜尋沿用舊狀態。
        item.hidden = hasMatches && !matchedItems.has(item);
      });

      document.body.classList.toggle("is-search-empty", !hasMatches);
      emptyPage.hidden = hasMatches;
      summary.textContent = `找到 ${matches.length} 項符合「${input.value.trim()}」的內容`;
      closeSearch();
    };

    toggle.addEventListener("click", () => {
      if (panel.hidden) {
        openSearch();
      } else {
        closeSearch();
      }
    });

    closeButton.addEventListener("click", closeSearch);
    form.addEventListener("submit", submitSearch);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        closeSearch();
      }
    });
  });
})();
