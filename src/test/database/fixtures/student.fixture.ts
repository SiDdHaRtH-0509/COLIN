/**
 * COLIN — Student Profile Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateUserFixtureSql } from './user.fixture';

export interface CreateStudentOptions {
  userId?: string;
  collegeName?: string;
  courseName?: string;
  graduationYear?: number;
}

export function generateStudentFixtureSql(options: CreateStudentOptions = {}) {
  const user = generateUserFixtureSql({
    id: options.userId,
    primaryRole: 'STUDENT',
    firstName: 'Student',
    lastName: 'Candidate',
  });

  const collegeName = options.collegeName || 'Delhi University';
  const courseName = options.courseName || 'B.Tech Computer Science';
  const graduationYear = options.graduationYear || 2027;

  const studentSql = `
    ${user.userSql}
    ${user.profileSql}
    INSERT INTO student_profiles (user_id, college_name, course_name, graduation_year, verification_status, created_at, updated_at)
    VALUES ('${user.id}', '${collegeName}', '${courseName}', ${graduationYear}, 'VERIFIED', NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  `;

  const cleanupSql = `
    DELETE FROM student_profiles WHERE user_id = '${user.id}';
    ${user.cleanupSql}
  `;

  return { studentId: user.id, studentSql, cleanupSql };
}
