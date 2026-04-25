import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "supersecret_access";

export const bcryptHash = async (varToHash: string): Promise<string> => {
  const hashed = await bcrypt.hash(varToHash, 10);

  return hashed;
};

export const comparePasswords = async (
  receivedPassword: string,
  userPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(receivedPassword, userPassword);
};

export const generateTokens = async (
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = jwt.sign({ sub: userId }, ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = crypto.randomBytes(32).toString("hex");

  return { accessToken, refreshToken };
};
