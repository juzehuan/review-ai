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

function readBooleanEnv(name, fallback = false) {
  const value = readEnv(name, fallback ? "true" : "false").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

const email = readEnv("DEFAULT_ADMIN_EMAIL", "admin").toLowerCase();
const password = readEnv("DEFAULT_ADMIN_PASSWORD", "123456");
const name = readEnv("DEFAULT_ADMIN_NAME", "admin");
const workspaceName = readEnv("DEFAULT_WORKSPACE_NAME", "Admin Workspace");
const workspaceSlug = readEnv("DEFAULT_WORKSPACE_SLUG", "admin-workspace");
const resetPassword = readBooleanEnv("DEFAULT_ADMIN_RESET_PASSWORD");
const uniqueSuperAdmin = readBooleanEnv("DEFAULT_ADMIN_UNIQUE_SUPER_ADMIN");
const passwordIsValid = password.length >= 6;

if (!email) {
  console.log("Skipping default admin seed: DEFAULT_ADMIN_EMAIL is invalid.");
  await prisma.$disconnect();
  process.exit(0);
}

const result = await prisma.$transaction(async (tx) => {
  let user = await tx.user.findUnique({
    where: { email }
  });

  let passwordReset = false;
  let skippedPasswordReset = false;
  let createdUser = false;

  if (!user) {
    if (!passwordIsValid) {
      return { user: null, workspace: null, skipped: "DEFAULT_ADMIN_PASSWORD must be at least 6 characters to create the default admin." };
    }
    user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        isSuperAdmin: true
      }
    });
    createdUser = true;
  } else {
    const updateData = {};
    if (resetPassword && passwordIsValid) {
      updateData.passwordHash = hashPassword(password);
      passwordReset = true;
    } else if (resetPassword) {
      skippedPasswordReset = true;
    }
    if (uniqueSuperAdmin && !user.isSuperAdmin) {
      updateData.isSuperAdmin = true;
    }
    if (Object.keys(updateData).length) {
      user = await tx.user.update({
        where: { email },
        data: updateData
      });
    }
  }

  if (uniqueSuperAdmin) {
    await tx.user.updateMany({
      where: {
        email: {
          not: email,
        },
        isSuperAdmin: true,
      },
      data: {
        isSuperAdmin: false,
      },
    });
  }

  let workspace = await tx.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { subscription: true }
  });
  let createdWorkspace = false;

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
    createdWorkspace = true;
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

  const membership = await tx.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } }
  });
  if (!membership) {
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "owner" }
    });
  }

  return { user, workspace, passwordReset, skippedPasswordReset, createdUser, createdWorkspace, createdMembership: !membership };
});

if (result.skipped) {
  console.log(`Skipping default admin seed: ${result.skipped}`);
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`Default admin ready: ${result.user.email} / workspace=${result.workspace.slug}`);
if (result.createdUser) {
  console.log("Default admin user was created.");
}
if (result.createdWorkspace) {
  console.log("Default workspace was created.");
}
if (result.createdMembership) {
  console.log("Default admin workspace membership was created.");
}
if (result.passwordReset) {
  console.log("Default admin password was reset because DEFAULT_ADMIN_RESET_PASSWORD=true.");
}
if (result.skippedPasswordReset) {
  console.log("Default admin password was not reset because DEFAULT_ADMIN_PASSWORD is shorter than 6 characters.");
}
if (uniqueSuperAdmin) {
  console.log("Other super admins were disabled because DEFAULT_ADMIN_UNIQUE_SUPER_ADMIN=true.");
}
await prisma.$disconnect();
