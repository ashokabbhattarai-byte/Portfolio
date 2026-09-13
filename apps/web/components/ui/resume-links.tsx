import { getProfile } from '@/lib/content';
import { Magnetic } from '@/components/motion/magnetic';
export async function ResumeLinks() {
  const profile = await getProfile();
  return (
    <div className="resume-links">
      <Magnetic>
        <a
          className="pill"
          href={profile.resume}
          target="_blank"
          rel="noreferrer"
        >
          View résumé <span>↗</span>
        </a>
      </Magnetic>
      <Magnetic>
        <a
          className="text-link"
          href={profile.resume}
          download="Ashok-Bhattarai-Resume.pdf"
        >
          Download PDF ↓
        </a>
      </Magnetic>
    </div>
  );
}
