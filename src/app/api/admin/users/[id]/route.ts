import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/permissions";
import * as bcrypt from "bcryptjs";

// PATCH /api/admin/users/[id] - Update user details (SUPER_ADMIN only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as any).role as string;
    const currentUserId = (session.user as any).id as string;
    if (!canManageUsers(currentRole)) {
      return NextResponse.json({ error: "Forbidden: Super Admins only" }, { status: 403 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;

    if (email) {
      // Check duplicate email
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: targetUserId },
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
      }
      dataToUpdate.email = email;
    }

    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    // Safety checks for self-modification
    const isSelf = currentUserId === targetUserId;

    if (role !== undefined) {
      if (isSelf && role !== targetUser.role) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      }
      const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
      }
      dataToUpdate.role = role;
    }

    if (isActive !== undefined) {
      if (isSelf && !isActive) {
        return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
      }
      dataToUpdate.isActive = !!isActive;
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User account updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user account (SUPER_ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as any).role as string;
    const currentUserId = (session.user as any).id as string;
    if (!canManageUsers(currentRole)) {
      return NextResponse.json({ error: "Forbidden: Super Admins only" }, { status: 403 });
    }

    const { id: targetUserId } = await params;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cascade delete any audit logs or deleted trip logs before deleting user
    // to prevent foreign key constraint violations
    await prisma.auditLog.deleteMany({
      where: { userId: targetUserId },
    });

    await prisma.deletedTripRecord.deleteMany({
      where: { deletedByUserId: targetUserId },
    });

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
