import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function readEnv(name, fallback) {
  return String(process.env[name] || fallback || "").trim();
}

const email = readEnv("DEFAULT_ADMIN_EMAIL", "admin@reviewiq.local").toLowerCase();
const password = readEnv("DEFAULT_ADMIN_PASSWORD", "Admin@123456");
const name = readEnv("DEFAULT_ADMIN_NAME", "Super Admin");
const workspaceName = readEnv("DEFAULT_WORKSPACE_NAME", "Admin Workspace");
const workspaceSlug = readEnv("DEFAULT_WORKSPACE_SLUG", "admin-workspace");

if (!email || !password || password.length < 6) {
  console.log("Skipping default admin seed: DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is invalid.");
  await prisma.$disconnect();
  process.exit(0);
}

const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: hashPassword(password),
      isSuperAdmin: true
    },
    create: {
      email,
      name,
      passwordHash: hashPassword(password),
      isSuperAdmin: true
    }
  });

  let workspace = await tx.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { subscription: true }
  });

  if (!workspace) {
    workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug: workspaceSlug,
        ownerUserId: user.id,
        subscription: {
          create: {
            planTier: "business",
            monthlyReviewLimit: 100000,
            monthlyRunLimit: 1000
          }
        }
      },
      include: { subscription: true }
    });
  } else if (!workspace.subscription) {
    await tx.subscription.create({
      data: {
        workspaceId: workspace.id,
        planTier: "business",
        monthlyReviewLimit: 100000,
        monthlyRunLimit: 1000
      }
    });
  }

  await tx.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: "owner" },
    create: { workspaceId: workspace.id, userId: user.id, role: "owner" }
  });

  return { user, workspace };
});

console.log(`Default super admin ready: ${result.user.email} / workspace=${result.workspace.slug}`);
await prisma.$disconnect();

