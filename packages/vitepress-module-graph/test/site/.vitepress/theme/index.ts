// Тема тестового сайта: подключение как у потребителя (README, «Подключение»).
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import { h } from "vue";
import { installModuleGraph, trackHeader } from "@wely6743/vitepress-module-graph/theme";
import "@wely6743/vitepress-module-graph/style.css";
import { data } from "../../modules/modules.data";

const theme: Theme = {
	extends: DefaultTheme,
	Layout: () => h(DefaultTheme.Layout, null, { "doc-before": trackHeader }),
	enhanceApp({ app }) {
		installModuleGraph(app, data);
	},
};

export default theme;
