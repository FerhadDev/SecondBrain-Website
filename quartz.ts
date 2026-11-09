import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PublicPresentation } from "./website/public-presentation"

const config = await loadQuartzConfig()
config.plugins.transformers.push(PublicPresentation())
export default config
export const layout = await loadQuartzLayout()
