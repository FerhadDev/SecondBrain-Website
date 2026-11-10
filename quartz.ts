import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PublicPresentation } from "./website/public-presentation"
import { installPublicHubRouting } from "./website/hub-routing"

const config = await loadQuartzConfig()
config.plugins.transformers.push(PublicPresentation())
installPublicHubRouting(config.plugins.pageTypes ?? [])
export default config
export const layout = await loadQuartzLayout()
