/**
 * The wire contract between the NestJS API and the Next app.
 *
 * These are the shapes the API serialises and the web app renders. They are
 * deliberately hand-written rather than re-exported from Prisma: the web app
 * must not depend on the database client, and the API is free to omit columns
 * (password hashes, ordering scaffolding) that never cross the wire.
 *
 * `category` stays in the display form the UI already filters on. The database
 * stores an enum; the API maps between the two.
 */
export type Category = 'AI' | 'Full stack' | 'Blockchain';
export const categories: Category[] = ['AI', 'Full stack', 'Blockchain'];

export type Project = {
  id: string;
  slug: string;
  title: string;
  category: Category;
  role: string;
  context: string;
  summary: string;
  color: string;
  ink: string;
  symbol: string;
  live?: string | null;
  image?: string | null;
  gallery?: string | null;
  overview: string;
  challenge: string;
  contribution: string;
  outcome: string;
  focus: string[];
  features: string[];
  published: boolean;
  featured: boolean;
  position: number;
  viewCount?: number;
};

export type Profile = {
  name: string;
  role: string;
  location: string;
  email: string;
  github: string;
  linkedin?: string | null;
  resume: string;
  description: string;
  languages: string;
};

export type Experience = {
  id: string;
  role: string;
  company: string;
  dates: string;
  detail: string;
  position: number;
};

export type Skill = {
  id: string;
  name: string;
  items: string;
  position: number;
};

export type Education = {
  id: string;
  school: string;
  award: string;
  dates: string;
  notes: string[];
  position: number;
};

export type Certification = {
  id: string;
  title: string;
  issuer: string;
  date: string;
  url?: string | null;
  position: number;
};

export type BlogStatus =
  'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'SCHEDULED' | 'UNPUBLISHED' | 'ARCHIVED';
export type BlogImagePlacement =
  'COVER' | 'HERO' | 'INLINE' | 'GALLERY' | 'THUMBNAIL';

export type BlogImage = {
  id: string;
  blogId: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  placement: BlogImagePlacement;
  position: number;
};

export type Blog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  gallery?: string | null;
  tags: string[];
  published: boolean;
  featured: boolean;
  position: number;
  status: BlogStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  linkedinUrl?: string | null;
  linkedinPostId?: string | null;
  linkedinStatus?: string | null;
  images: BlogImage[];
  viewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  featuredImageId?: string | null;
  ogImageId?: string | null;
  featuredImage?: MediaAsset | null;
  ogImage?: MediaAsset | null;
  inlineMediaIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
  authorId?: string | null;
  author?: { id: string; name: string } | null;
  createdByAI?: boolean;
  aiProvider?: string | null;
  aiModel?: string | null;
  timezone?: string;
  version?: number;
};

export type Role = 'ADMIN' | 'EDITOR';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** Everything the public site needs, in one round trip. */
export type SiteContent = {
  profile: Profile;
  projects: Project[];
  blogs: Blog[];
  experience: Experience[];
  skills: Skill[];
  education: Education[];
  certifications: Certification[];
};

export type PageView = {
  id: string;
  path: string;
  blogId?: string | null;
  projectId?: string | null;
  referer?: string | null;
  createdAt: string;
};

export type BlogAnalytics = {
  blog: Blog;
  views: number;
  uniqueViews: number;
  visits: number;
  uniquePageViews: number;
  likes?: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  daily: Array<{
    date: string;
    views: number;
    visitors: number;
    visits: number;
  }>;
  topReferers: Array<{ referer: string; count: number }>;
};

export type PortfolioAnalytics = {
  totals: {
    pageViews: number;
    blogViews: number;
    projectViews: number;
    uniqueVisitors: number;
    visits: number;
    uniquePageViews: number;
    likes: number;
  };
  topBlogs: Array<{
    blog: Pick<Blog, 'id' | 'slug' | 'title' | 'coverImage' | 'viewCount'>;
    views: number;
  }>;
  topProjects: Array<{
    project: Pick<Project, 'id' | 'slug' | 'title' | 'image' | 'viewCount'>;
    views: number;
  }>;
  daily: Array<{
    date: string;
    views: number;
    visitors: number;
    visits: number;
  }>;
  byTag: Array<{ tag: string; views: number }>;
  topReferers: Array<{ referer: string; count: number }>;
  mostLiked: Array<{
    blog: Pick<Blog, 'id' | 'slug' | 'title'>;
    likes: number;
    views: number;
  }>;
};

export type RouteAnalytics = {
  path: string;
  views: number;
  uniqueViews: number;
  visits: number;
  uniquePageViews: number;
  likes?: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  daily: Array<{
    date: string;
    views: number;
    visitors: number;
    visits: number;
  }>;
  topReferers: Array<{ referer: string; count: number }>;
};

export type RoutesAnalytics = Array<{
  path: string;
  views: number;
  unique: number;
  lastViewed: string | null;
}>;

/** Cache tags the API asks Next to revalidate after a write. */
export const contentTags = [
  'profile',
  'projects',
  'blogs',
  'experience',
  'skills',
  'education',
  'certifications',
] as const;
export type ContentTag = (typeof contentTags)[number];

/** Anonymous, idempotent public-page measurement. No raw IP or query string is stored. */
export type TrackPageView = {
  path: string;
  eventId: string;
  visitorId?: string;
  referer?: string | null;
};
export type PublicViewCount = {
  path: string;
  views: number | null;
  likes?: number | null;
  liked?: boolean;
};
export type BlogLike = {
  blogId: string;
  visitorHash: string;
  createdAt: string;
};
export type SetBlogLike = { path: string; visitorId: string; liked: boolean };

export type MediaAsset = {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  provider: string;
  objectKey: string;
  url: string;
  alt: string;
  caption: string;
  /** ADMIN_UPLOAD | AI_UPLOAD | URL_IMPORT | AI_GENERATED */
  source: string;
  uploadedBy: string;
  generatedByAI: boolean;
  aiProvider?: string | null;
  aiModel?: string | null;
  /** The generation prompt, or the origin URL for an imported image. */
  prompt?: string | null;
  purpose?: string | null;
  createdAt: string;
  /** Present on list responses: whether any article references this asset. */
  used?: boolean;
  usageCount?: number;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

/** Must stay identical to SCOPES in apps/api/src/publishing/scopes.ts — the
 *  guard compares against that list, so anything extra here is unenforceable. */
export const publisherScopes = [
  'blog:read',
  'blog:create',
  'blog:update',
  'blog:publish',
  'blog:schedule',
  'blog:unpublish',
  'media:read',
  'media:upload',
  'media:generate',
  'media:delete',
] as const;
export type PublisherScope = (typeof publisherScopes)[number];

export type PublisherKey = {
  id: string;
  name: string;
  /** The public half of the key, safe to display. */
  prefix: string;
  scopes: PublisherScope[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  status: 'active' | 'revoked' | 'expired';
};

/** Returned by create and rotate only. `key` is never retrievable again. */
export type IssuedPublisherKey = PublisherKey & { key: string };

export type PublisherScopeInfo = {
  scope: PublisherScope;
  description: string;
};

export type AuditEvent = {
  id: string;
  actorType: 'ADMIN' | 'AI_API_KEY' | 'SYSTEM';
  actorId: string;
  apiKeyId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  correlationId: string;
  success: boolean;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  /** Resolved by the activity endpoint so the feed can name the key. */
  apiKey?: { id: string; name: string; prefix: string } | null;
};

export type BlogRevision = {
  id: string;
  version: number;
  actorType: string;
  actorId: string;
  createdAt: string;
};

/** An image as it is *sent* to the API: the server owns `id` and `blogId`. */
export type BlogImageInput = Omit<BlogImage, 'id' | 'blogId'>;

/** What a client may write to a blog. Narrower than `Blog`, which also carries
 *  server-owned fields (id, timestamps, resolved relations) that a write must
 *  not try to set. */
export type BlogInput = Partial<
  Omit<
    Blog,
    | 'id'
    | 'images'
    | 'featuredImage'
    | 'ogImage'
    | 'author'
    | 'createdAt'
    | 'updatedAt'
    | 'publishedAt'
    | 'viewCount'
    | 'version'
  >
> & { images?: BlogImageInput[] };

/** Row shape returned by the paginated admin blog search. */
export type BlogSummary = Pick<
  Blog,
  'id' | 'title' | 'slug' | 'excerpt' | 'tags' | 'status' | 'coverImage'
> & {
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdByAI: boolean;
  version: number;
  featuredImage?: { id: string; url: string; alt: string } | null;
  author?: { name: string } | null;
};
