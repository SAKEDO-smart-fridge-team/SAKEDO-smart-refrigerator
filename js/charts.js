(() => {
	const COLORS = {
		protein: "#FF7B8E",
		veggies: "#4edbba",
		carbs: "#FFB3CA",
		empty: "#f0f0f0"
	};
	const DAY_MS = 24 * 60 * 60 * 1000;

	const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

	const startOfDay = (date) => {
		const copy = new Date(date);
		copy.setHours(0, 0, 0, 0);
		return copy;
	};

	const getViewBoxSize = (svgEl) => {
		const viewBox = (svgEl.getAttribute("viewBox") || "0 0 800 300")
			.trim()
			.split(/\s+/)
			.map(Number);
		return {
			width: Number.isFinite(viewBox[2]) ? viewBox[2] : 800,
			height: Number.isFinite(viewBox[3]) ? viewBox[3] : 300
		};
	};

	const buildPath = (values, width, height, padding) => {
		const safeValues = values.length ? values : [0];
		const maxVal = Math.max(...safeValues, 1);
		const minVal = 0;
		const innerW = width - padding.left - padding.right;
		const innerH = height - padding.top - padding.bottom;

		return safeValues
			.map((val, index) => {
				const x = padding.left + (innerW * index) / (safeValues.length - 1 || 1);
				const normalized = (val - minVal) / (maxVal - minVal || 1);
				const y = padding.top + innerH - normalized * innerH;
				return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(" ");
	};

	const getWeeklySeries = (items, field, days = 7) => {
		const today = startOfDay(new Date());
		const start = new Date(today.getTime() - (days - 1) * DAY_MS);
		const counts = Array.from({ length: days }, () => 0);

		items.forEach((item) => {
			const rawDate = item?.[field];
			if (!rawDate) return;
			const date = startOfDay(new Date(rawDate));
			if (Number.isNaN(date.getTime())) return;
			if (date < start || date > today) return;
			const index = Math.floor((date - start) / DAY_MS);
			if (index < 0 || index >= days) return;
			counts[index] += Number(item.quantity) || 1;
		});

		return counts;
	};

	const emptySeries = (days = 7) => Array.from({ length: days }, () => 0);

	const updateDonutFromCounts = (counts) => {
		const circle = document.querySelector(".chart-circle");
		if (!circle) return;

		const total = (counts?.protein || 0) + (counts?.veggies || 0) + (counts?.carbs || 0);
		if (total <= 0) {
			circle.classList.add("empty-chart");
			circle.style.background = COLORS.empty;
			return;
		}

		circle.classList.remove("empty-chart");
		const proteinPct = (counts.protein / total) * 100;
		const veggiesPct = (counts.veggies / total) * 100;
		const carbsPct = 100 - proteinPct - veggiesPct;

		circle.style.background = `conic-gradient(${COLORS.protein} 0% ${proteinPct.toFixed(2)}%, ${COLORS.veggies} ${proteinPct.toFixed(
			2
			)}% ${(proteinPct + veggiesPct).toFixed(2)}%, ${COLORS.carbs} ${(proteinPct + veggiesPct).toFixed(
			2
			)}% 100%)`;
	};

	const retriggerAnimation = (pathEl, className) => {
		if (!pathEl) return;
		pathEl.classList.remove(className);
		void pathEl.getBoundingClientRect();
		pathEl.classList.add(className);
	};

	const renderLineChart = (seriesOne, seriesTwo) => {
		const svg = document.querySelector(".line-chart-svg");
		if (!svg) return;

		const pathOne = svg.querySelector(".chart-line-one");
		const pathTwo = svg.querySelector(".chart-line-two");
		const { width, height } = getViewBoxSize(svg);
		const padding = { top: 40, right: 20, bottom: 35, left: 60 };
		const combinedMax = Math.max(...seriesOne, ...seriesTwo, 1);

		const buildScaledPath = (series) => {
			const scaled = series.map((value) => (combinedMax ? (value / combinedMax) * 10 : 0));
			return buildPath(scaled, width, height, padding);
		};

		if (pathOne) {
			pathOne.setAttribute("d", buildScaledPath(seriesOne));
			retriggerAnimation(pathOne, "chart-line-one");
		}
		if (pathTwo) {
			pathTwo.setAttribute("d", buildScaledPath(seriesTwo));
			retriggerAnimation(pathTwo, "chart-line-two");
		}
	};

	const loadItemsForCharts = async () => {
		if (!window.sakedoApi) return [];
		const auth = window.sakedoApi.getStoredAuth();
		if (!auth?.access_token) return [];
		try {
			return await window.sakedoApi.getFridgeItems();
		} catch (error) {
			return [];
		}
	};

	const initHomeCharts = async () => {
		const svg = document.querySelector(".line-chart-svg");
		if (!svg) return;

		const items = await loadItemsForCharts();
		const intakeSeries = getWeeklySeries(items, "created_at", 7);
		let cookedSeries = getWeeklySeries(items, "updated_at", 7);

		if (intakeSeries.every((value) => value === 0)) {
			renderLineChart(emptySeries(7), emptySeries(7));
			return;
		}

		if (cookedSeries.every((value) => value === 0)) {
			cookedSeries = intakeSeries.map((value) => Math.max(0, Math.round(value * 0.6)));
		}

		renderLineChart(intakeSeries, cookedSeries);
	};

	document.addEventListener("pageChanged", (event) => {
		if (event.detail.page === "home") {
			initHomeCharts();
		}
	});

	document.addEventListener("homeStatsUpdated", (event) => {
		updateDonutFromCounts(event.detail?.counts);
	});

	window.sakedoCharts = { initHomeCharts };
})();
