// Загрузчик данных, как на сайте потребителя (README, «Подключение»): папка этого файла и есть папка модулей.
import { createModulesLoader } from "@wely6743/vitepress-module-graph/node";
import type { ModuleGraphData } from "@wely6743/vitepress-module-graph";

declare const data: ModuleGraphData;
export { data };

export default createModulesLoader(import.meta.url);
