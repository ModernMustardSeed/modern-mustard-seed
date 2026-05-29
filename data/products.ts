/**
 * MMS Digital Product Catalog.
 *
 * Native Stripe checkout. PDFs live in Supabase Storage bucket `store-products`
 * (private). Buyers get a 24h signed download URL after Stripe webhook confirms
 * payment. Buyer email is dropped into the `leads` table with source
 * `store-buyer` so downstream funnel logic (chatbot, audit, sequences) can
 * recognize them.
 *
 * Each product page generates Product/Offer/HowTo/FAQPage JSON-LD so the
 * catalog is indexable for AI shopping (ChatGPT, Gemini, Perplexity, Copilot)
 * and standard search.
 *
 * To go live with a new product:
 *  1. Upload the PDF to Supabase Storage bucket `store-products` with the
 *     exact filename in `pdfFileName` below.
 *  2. Create the Product + Price in Stripe Dashboard (mode: payment, one-time).
 *  3. Paste the price ID into `stripePriceId` below.
 */

export type Product = {
  slug: string;
  name: string;
  category: 'Business Foundations' | 'Build with Claude';
  pitch: string;
  whatsInside: string;
  toc: string[];
  pages: number;
  priceUsd: number;
  /** Stripe Price ID (price_xxx). Empty string until Sarah creates it in Stripe Dashboard. */
  stripePriceId: string;
  /** Filename in Supabase Storage bucket `store-products`. */
  pdfFileName: string;
  idealBuyer: string;
  funnelRole: string;
  /** Hex color used as accent on the product page header. */
  accentColor: string;
  /** Internal label used to nudge the chatbot/audit cross-sell logic. */
  recommendFor: string[];
  testimonials?: { quote: string; name: string; role?: string }[];
  comingSoon?: boolean;
};

export type Bundle = {
  slug: string;
  name: string;
  pitch: string;
  priceUsd: number;
  savings: number;
  individualTotal: number;
  productSlugs: string[];
  /** Stripe Price ID for the bundle. Empty string until Sarah creates it in Stripe Dashboard. */
  stripePriceId: string;
};

export const products: Product[] = [
  {
    slug: 'ai-ready-business-blueprint',
    name: 'The AI-Ready Business Blueprint',
    category: 'Business Foundations',
    pitch:
      'The complete system for identifying, scoping, and building your first high-impact AI product in 30 days or less.',
    whatsInside:
      'A fill-in-the-numbers workbook that walks you from business audit to build brief in five sessions. Includes a scoring matrix for ranking automation opportunities, a real ROI calculator, a 30-day implementation roadmap with daily milestones, and the Five-Gate decision framework you can reuse for every future AI initiative. This is the same pre-build assessment we run with every consulting client at Modern Mustard Seed.',
    toc: [
      'Business Landscape Audit. Map what you have, what works, and what drains you',
      'The Automation Opportunity Score. Quantify where AI creates the most value',
      'Your AI Product Canvas. Define the product. What it does, who it serves, what it replaces',
      'Technical Reality Check. Stack, integrations, data, and build-or-buy decisions',
      'The Build Brief. Scope, timeline, budget, success criteria, and risk map',
      'ROI Calculator and Kill Criteria. Run the real math. Know when to walk away',
      '30-Day Implementation Roadmap. Daily milestones from kickoff to launch',
      'The Decision Framework. A reusable system for every future AI opportunity',
      'What Good Looks Like. Before-and-after examples of real product scoping',
      'Resource Library. Prompts, cost references, stack matrix, and next steps',
    ],
    pages: 33,
    priceUsd: 47,
    stripePriceId: 'price_1TcSTmJkPPLrDL9He25lKB07',
    pdfFileName: 'MMS_AI-Ready_Business_Blueprint_FINAL.pdf',
    idealBuyer:
      'Second-business operators, service business owners exploring AI, solo operators who want to build an AI product but do not know where to start.',
    funnelRole: 'Entry point. Builds trust. Qualifies leads for $225/hr consulting.',
    accentColor: '#C8964E',
    recommendFor: ['ai-curious', 'scoping', 'first-build', 'audit-fail-ai-features'],
  },
  {
    slug: 'ai-native-business-playbook',
    name: 'The AI-Native Business Playbook',
    category: 'Business Foundations',
    pitch:
      'The complete operating system for building, buying, and running service businesses that use AI as infrastructure, not accessory.',
    whatsInside:
      'Three tracks in one playbook. BUILD an AI-native service business from scratch, BUY an existing business and automate it for 2-3x margin improvement, or RUN your current business with AI handling 60 to 80 percent of the repetitive work. Includes the AI-Native Business Model Canvas, a 7-dimension Acquisition Scorecard, a due diligence checklist built for automation readiness, a 90-day transformation plan, and the daily operating rhythm that runs a $500K business on 25 to 45 minutes of human time per day. Built from 40+ shipped production AI systems.',
    toc: [
      'What AI-Native Actually Means. And why most businesses get it wrong',
      'The Economics of AI Labor. Margins, pricing, and the math that changes everything',
      'The AI-Native Business Model Canvas. Design a business built on AI infrastructure',
      'Choosing Your Service Category. Where AI-native businesses win hardest',
      'Building the Machine. Stack, systems, and the first 90 days',
      'Pricing for AI-Native. Charge for outcomes. Not hours. Not seats',
      'The Acquisition Thesis. Why buying boring businesses is the smartest AI play',
      'The AI Acquisition Scorecard. Evaluate any business for automation potential',
      'Due Diligence for Automation. What to check that traditional buyers miss',
      'The 90-Day Transformation. From close to AI-native operations',
      'The AI-Native Operating System. Daily, weekly, monthly rhythms for a lean team',
      'Hiring for an AI-Native Company. Who you need, who you do not, and when',
      'Client Delivery at Scale. Serve 50 clients with a team of 3',
      'The Playbook Library. Templates, checklists, scripts, and tools',
    ],
    pages: 44,
    priceUsd: 47,
    stripePriceId: 'price_1TcSTnJkPPLrDL9HyrCUyNDi',
    pdfFileName: 'MMS_AI-Native_Business_Playbook_FINAL.pdf',
    idealBuyer:
      'Entrepreneurs starting AI-native service businesses, business buyers interested in automation arbitrage, existing service business owners rebuilding operations with AI.',
    funnelRole:
      'Pairs with Blueprint. Blueprint answers "what should I build?" Playbook answers "how do I build a whole business around it?"',
    accentColor: '#1B2838',
    recommendFor: ['agency-owner', 'acquisition', 'service-business', 'scale'],
  },
  {
    slug: 'shopify-store-with-claude-code',
    name: 'Shopify Store with Claude Code',
    category: 'Build with Claude',
    pitch:
      'The complete technical playbook for building a production Shopify store with Claude Code as your development partner.',
    whatsInside:
      'From environment setup to production launch using AI-powered development. Covers the CLAUDE.md file that turns Claude Code into your permanent store developer, theme customization command patterns (build custom sections in 5 to 10 minutes each), bulk product creation from CSV with AI-generated descriptions, Storefront API integrations, complete SEO infrastructure, and a library of 50+ production-tested prompts for every Shopify task. Every command was tested on real production stores.',
    toc: [
      'Claude Code and Shopify. The setup. Environment, authentication, and your first command',
      'The CLAUDE.md File. Turn Claude Code into your permanent store developer',
      'Store Architecture Decisions. Theme vs headless, apps vs custom, and what to build first',
      'Theme Customization with Claude Code. Liquid templates, CSS, sections, and blocks',
      'Product Automation. Bulk creation, description generation, variant management, image optimization',
      'Collection and Navigation Architecture. Smart collections, automated merchandising, menu systems',
      'Storefront API Integrations. Custom storefronts, AJAX carts, dynamic pricing, real-time inventory',
      'SEO Infrastructure. Technical SEO, meta tags, structured data, and content that ranks',
      'Performance and Speed. Core Web Vitals, image optimization, lazy loading, caching',
      'Analytics and Monitoring. Track what matters, automate reporting, catch problems early',
      'The Daily, Weekly, Monthly Rhythm. Store operations on autopilot with Claude Code',
      'Scaling. From 10 to 10,000 orders. Inventory, fulfillment, customer service automation',
      'The Prompt Library. 50+ production-tested prompts for every Shopify task',
    ],
    pages: 39,
    priceUsd: 67,
    stripePriceId: 'price_1TcSToJkPPLrDL9H9j7BvSlB',
    pdfFileName: 'MMS_Shopify_Store_with_Claude_Code_FINAL.pdf',
    idealBuyer:
      'Entrepreneurs launching Shopify stores, existing store owners who want to use Claude Code, non-technical founders who want production-quality stores without hiring a developer.',
    funnelRole: 'Technical credibility product. Shows MMS builds real things.',
    accentColor: '#1B3A4B',
    recommendFor: ['shopify', 'ecommerce', 'apparel', 'dtc', 'audit-fail-conversion'],
  },
  {
    slug: 'claude-code-masterclass',
    name: 'The Claude Code Masterclass',
    category: 'Build with Claude',
    pitch:
      'Everything you need to ship production apps from your terminal using Claude Code as your AI development partner.',
    whatsInside:
      'The complete Claude Code system. Installation, the CLAUDE.md memory file that makes Claude Code indispensable, the prompt framework that gets production-ready code on the first try, Skills and MCP server integrations, and two full project walkthroughs you can build along with. Includes 100+ production-tested prompts organized by category (web development, automation, content, debugging) and the daily development workflow that compounds results session over session. You do not need to be a developer. You need a terminal and this playbook.',
    toc: [
      'What Claude Code Actually Is. And why it changes everything about how you build',
      'Setup and Installation. From zero to your first session in 15 minutes',
      'The CLAUDE.md System. The file that turns Claude Code from good to indispensable',
      'The Art of the Prompt. How to direct Claude Code and get it right the first time',
      'Project Workflows. From blank folder to deployed application',
      'Skills, MCP Servers, and Extensions. Turn Claude Code into a specialist for any domain',
      'Project. Build a Client Dashboard. Complete walkthrough from blank folder to deployed app',
      'Project. Automate Your Business. Build the systems that run while you sleep',
      'The Prompt Library. 100+ production-tested prompts organized by category',
    ],
    pages: 27,
    priceUsd: 67,
    stripePriceId: 'price_1TcSTqJkPPLrDL9HdNKI4rGR',
    pdfFileName: 'MMS_Claude_Code_Masterclass_FINAL.pdf',
    idealBuyer:
      'Anyone who wants to build software without being a developer, solo operators who want to ship their own tools, developers who want to 10x their speed with AI.',
    funnelRole: 'Gateway product. Makes every other Build with Claude product more valuable.',
    accentColor: '#1A1A2E',
    recommendFor: ['developer', 'solo-builder', 'claude-curious', 'first-app'],
  },
  {
    slug: 'ai-sales-machine',
    name: 'The AI Sales Machine',
    category: 'Business Foundations',
    pitch:
      'Build an automated outreach, qualification, and proposal system that books calls while you sleep.',
    whatsInside:
      'The complete AI-powered sales system. Ideal Client Profile scorecard, the research-first outreach engine that makes every cold email feel personal, three email frameworks that actually get responses, a proposal generator that turns a discovery call into a custom PDF in 4 minutes, and automated follow-up sequences. Includes pipeline management setup, a weekly review prompt, and a full sales prompt library organized by stage. Same amount of selling. 30 fewer hours of admin per week.',
    toc: [
      'The AI Sales Advantage. Why a system beats a salesperson for 80 percent of the process',
      'Building Your Ideal Client Profile. The foundation that makes everything else work',
      'The Outreach Engine. Personalized messages at scale without sounding like a robot',
      'The Proposal Generator. From discovery call to custom proposal in 4 minutes',
      'Pipeline Management. The dashboard that runs your sales on autopilot',
      'The Prompt Library. Every sales prompt you need, ready to copy and use',
    ],
    pages: 18,
    priceUsd: 47,
    stripePriceId: 'price_1TcSTrJkPPLrDL9HJ6uVrPXP',
    pdfFileName: 'MMS_AI_Sales_Machine_FINAL.pdf',
    idealBuyer:
      'Solo operators who need more clients, service business owners who hate cold outreach, anyone who wants a repeatable sales system without hiring a sales team.',
    funnelRole: 'Revenue product. Immediate ROI for buyers.',
    accentColor: '#2D1B2E',
    recommendFor: ['sales', 'outreach', 'service-business', 'audit-fail-conversion'],
  },
  {
    slug: 'brand-studio-playbook',
    name: 'The Brand Studio Playbook',
    category: 'Build with Claude',
    pitch:
      'Build a complete brand system using AI as your creative director. Voice, visual identity, brand vault, and content production.',
    whatsInside:
      'What used to cost $15,000 to $50,000 from a branding agency now costs a weekend and this playbook. Build a complete brand system. Voice document that makes AI write in your exact tone, 5-color system with typography pairing, the Brand Vault master document, and a content production system that generates a month of on-brand content in one afternoon. Built from the same system used to create Cross + Covenant and Modern Mustard Seed.',
    toc: [
      'What a Brand System Actually Is. And why most businesses do not have one',
      'Building Your Brand Voice. The document that makes AI sound like you',
      'Visual Identity with AI. Colors, typography, and design systems built in an afternoon',
      'The Brand Vault. The master document that holds everything together',
      'Content Production System. Create a month of on-brand content in one afternoon',
      'The Prompt Library. Every brand-building prompt you need',
    ],
    pages: 20,
    priceUsd: 67,
    stripePriceId: 'price_1TcSTsJkPPLrDL9HlGAkHzpJ',
    pdfFileName: 'MMS_Brand_Studio_Playbook_FINAL.pdf',
    idealBuyer:
      'New businesses that need a brand system, existing businesses that have a logo but not a brand, anyone who wants agency-quality branding on a DIY budget.',
    funnelRole: 'Creative product. Pairs with Claude Code Masterclass for the full build toolkit.',
    accentColor: '#1B2E2B',
    recommendFor: ['brand', 'new-business', 'rebrand', 'audit-fail-brand'],
  },
  {
    slug: 'geo-ai-commerce-playbook',
    name: 'The GEO and AI Commerce Playbook',
    category: 'Build with Claude',
    pitch:
      'Get found by AI. Get cited by AI. Get sold by AI. The new rules for search, discovery, and commerce in 2026.',
    whatsInside:
      'SEO is not dead, but it is no longer enough. This playbook covers Generative Engine Optimization (how to get cited in ChatGPT, Perplexity, Google AI, and Gemini answers), AI commerce setup (connecting your store to every AI shopping channel for in-chat checkout), product data optimization for AI recommendations, the emerging AI advertising landscape, and measurement systems for tracking AI visibility. Includes the GEO content framework, platform-specific optimization tables, a 15-point launch checklist, and a full prompt library. Built on the latest data: 693% AI traffic growth, 57% higher order values from AI shoppers, and fewer than 12% of businesses with a strategy for any of it.',
    toc: [
      'The Death of 10 Blue Links. What changed, what is coming, and why it matters',
      'GEO vs SEO vs AEO. What each one is, how they overlap, and what to prioritize',
      'The AI Shopping Revolution. How people buy inside ChatGPT, Perplexity, Gemini, and Google AI Mode',
      'How AI Decides What to Cite. The mechanics of AI retrieval and citation',
      'The GEO Content Framework. Structure content so AI engines cite you by name',
      'Platform-Specific Optimization. What works on each AI platform',
      'AI Commerce Setup. Connect your store to every AI shopping channel',
      'Product Data Optimization. Make your products the ones AI recommends',
      'The AI Ads Landscape. What is coming and how to prepare now',
      'Measuring AI Visibility. Track citations, mentions, and AI-referred traffic',
      'The Monthly GEO Rhythm. The operating system for staying visible in AI search',
      'The Prompt and Checklist Library. Everything you need to execute, ready to copy',
    ],
    pages: 30,
    priceUsd: 67,
    stripePriceId: 'price_1TcSTuJkPPLrDL9Hf9X6vGJV',
    pdfFileName: 'MMS_GEO_AI_Commerce_Playbook_FINAL.pdf',
    idealBuyer:
      'E-commerce store owners, service businesses that depend on search traffic, anyone selling products online who wants to be visible in AI-generated answers and AI shopping channels.',
    funnelRole: 'Most timely product in catalog. Highest search demand. Strong standalone seller.',
    accentColor: '#0D1B2A',
    recommendFor: ['geo', 'seo', 'ecommerce', 'audit-fail-geo', 'audit-fail-seo'],
  },
];

export const bundles: Bundle[] = [
  {
    slug: 'foundations-bundle',
    name: 'The Foundations Bundle',
    pitch:
      'The complete business strategy stack. Find your opportunity, design your business, and build the sales system that fills it.',
    priceUsd: 97,
    savings: 44,
    individualTotal: 141,
    productSlugs: ['ai-ready-business-blueprint', 'ai-native-business-playbook', 'ai-sales-machine'],
    stripePriceId: 'price_1TcSTvJkPPLrDL9HIfk7Ip5O',
  },
  {
    slug: 'builder-bundle',
    name: 'The Builder Bundle',
    pitch:
      'The complete technical builder stack. Claude Code mastery, Shopify builds, brand systems, and AI-powered discovery.',
    priceUsd: 197,
    savings: 71,
    individualTotal: 268,
    productSlugs: [
      'shopify-store-with-claude-code',
      'claude-code-masterclass',
      'brand-studio-playbook',
      'geo-ai-commerce-playbook',
    ],
    stripePriceId: 'price_1TcSTwJkPPLrDL9Hu5hzZZEo',
  },
  {
    slug: 'complete-library',
    name: 'The Complete Library',
    pitch:
      'Everything Modern Mustard Seed knows about building, running, and growing AI-native businesses. Seven playbooks. 240+ pages. One price.',
    priceUsd: 247,
    savings: 115,
    individualTotal: 362,
    productSlugs: products.map((p) => p.slug),
    stripePriceId: 'price_1TcSTyJkPPLrDL9HY1FSp8Lz',
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getBundleBySlug(slug: string): Bundle | undefined {
  return bundles.find((b) => b.slug === slug);
}

/** A bundle inherits coming-soon if any of its included products is still
 *  awaiting upload. Prevents bundle buyers from getting broken PDF links. */
export function isComingSoon(slug: string): boolean {
  const product = getProductBySlug(slug);
  if (product) return !!product.comingSoon;
  const bundle = getBundleBySlug(slug);
  if (!bundle) return false;
  return bundle.productSlugs.some((s) => {
    const p = getProductBySlug(s);
    return p?.comingSoon;
  });
}
