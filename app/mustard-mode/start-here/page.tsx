import { buildMetadata, SITE } from '@/lib/seo';
import StartHere from '@/components/mustard-mode/StartHere';

export const metadata = buildMetadata({
  title: 'Never Used Claude or a Terminal? Start Here',
  description:
    'The free, ten-minute setup guide for total beginners: create your Claude account, open a terminal for the first time, install Claude Code, and learn the fundamentals. No jargon.',
  path: '/mustard-mode/start-here',
});

export default function StartHerePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Set Up Claude and Claude Code for the First Time',
    description:
      'A beginner walkthrough: create a Claude account, open a terminal on Mac or Windows, install Claude Code, and learn the core fundamentals.',
    totalTime: 'PT10M',
    step: [
      { '@type': 'HowToStep', name: 'Know the difference: claude.ai vs. Claude Code', text: 'claude.ai is the chat website. Claude Code is the command-line agent that builds real software on your computer.' },
      { '@type': 'HowToStep', name: 'Create your account and pick a plan', text: 'Sign up at claude.ai. One account and subscription powers both claude.ai and Claude Code.' },
      { '@type': 'HowToStep', name: 'Open a terminal for the first time', text: 'Mac: Cmd+Space, type Terminal. Windows: Windows key, type PowerShell or Windows Terminal.' },
      { '@type': 'HowToStep', name: 'Install Claude Code and run your first command', text: 'Run the install command from claude.ai/code, make a practice folder, and start your first session.' },
      { '@type': 'HowToStep', name: 'Learn prompts, context, and permission', text: 'The three ideas that make every future Claude session make sense.' },
      { '@type': 'HowToStep', name: 'Adopt two safety habits', text: 'Never paste real secrets into a prompt, and ask before you approve when unsure.' },
    ],
    publisher: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StartHere />
    </>
  );
}
