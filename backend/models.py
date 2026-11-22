from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# 1. The Core User Table (Handles Login for EVERYONE)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'admin', 'teacher', 'student', 'parent'

    # Relationships (Links to specific profile tables)
    student_profile = relationship("Student", back_populates="user_account", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("Teacher", back_populates="user_account", uselist=False, cascade="all, delete-orphan")
    parent_profile = relationship("Parent", back_populates="user_account", uselist=False, cascade="all, delete-orphan")


# 2. Parent Profile Table (1:M relationship with Student)
class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)

    # Relationships
    user_account = relationship("User", back_populates="parent_profile")
    students = relationship("Student", back_populates="parent")


# 3. The Student Profile Table
class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    parent_id = Column(Integer, ForeignKey("parents.id"), nullable=True)
    full_name = Column(String, nullable=False)
    grade = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    phone = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    safe_box_status = Column(String, default="Safe")  # Safe, Warning, At Risk

    # Relationships
    user_account = relationship("User", back_populates="student_profile")
    parent = relationship("Parent", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    test_marks = relationship("Term_Test_Mark", back_populates="student", cascade="all, delete-orphan")
    fee_payments = relationship("Fee_Payment", back_populates="student", cascade="all, delete-orphan")


# 4. The Teacher Profile Table
class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    full_name = Column(String, nullable=False)
    dob = Column(Date, nullable=True)
    phone = Column(String, nullable=True)

    # Relationships
    user_account = relationship("User", back_populates="teacher_profile")
    class_batches = relationship("Class_Batch", back_populates="teacher", cascade="all, delete-orphan")


# 5. Class Batch Table
class Class_Batch(Base):
    __tablename__ = "class_batches"

    class_id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=False)
    subject_name = Column(String, nullable=False)
    grade_level = Column(String, nullable=False)

    @property
    def id(self):
        return self.class_id

    # Relationships
    teacher = relationship("Teacher", back_populates="class_batches")
    enrollments = relationship("Enrollment", back_populates="class_batch", cascade="all, delete-orphan")
    schedules = relationship("Class_Schedule", back_populates="class_batch", cascade="all, delete-orphan")
    materials = relationship("Tute_Material", back_populates="class_batch", cascade="all, delete-orphan")

# Alias for standard CamelCase access
ClassBatch = Class_Batch


# 6. Enrollment Table (M:N between Student and Class_Batch)
class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("class_batches.class_id"), nullable=False)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="enrollments")
    class_batch = relationship("Class_Batch", back_populates="enrollments")


# 7. Class Schedule Table
class Class_Schedule(Base):
    __tablename__ = "class_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("class_batches.class_id"), nullable=False)
    session_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)  # e.g., "08:30 AM" or "14:00"

    @property
    def id(self):
        return self.schedule_id

    # Relationships
    class_batch = relationship("Class_Batch", back_populates="schedules")
    attendances = relationship("Attendance", back_populates="schedule", cascade="all, delete-orphan")

# Alias for standard CamelCase access
ClassSchedule = Class_Schedule


# 8. Attendance Table
class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("class_schedules.schedule_id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    status = Column(String, nullable=False, default="Present")  # 'Present' or 'Absent'

    # Relationships
    schedule = relationship("Class_Schedule", back_populates="attendances")
    student = relationship("Student", back_populates="attendances")


# 9. Tute Material Table
class Tute_Material(Base):
    __tablename__ = "tute_materials"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("class_batches.class_id"), nullable=False)
    title = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    class_batch = relationship("Class_Batch", back_populates="materials")

# Alias for standard CamelCase access
TuteMaterial = Tute_Material


# 10. Term Test Mark Table
class Term_Test_Mark(Base):
    __tablename__ = "term_test_marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject_name = Column(String, nullable=False)
    term_number = Column(Integer, nullable=False)  # 1, 2, 3
    marks = Column(Float, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="test_marks")

# Alias for standard CamelCase access
TermTestMark = Term_Test_Mark


# 11. Fee Payment Table (Currency: LKR)
class Fee_Payment(Base):
    __tablename__ = "fee_payments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    month = Column(String, nullable=False)  # e.g., "October 2026" or "2026-10"
    amount = Column(Float, nullable=False)  # Fee amount in LKR (Sri Lankan Rupee)
    currency = Column(String, default="LKR", nullable=False)
    status = Column(String, nullable=False, default="Pending")  # 'Paid' or 'Pending'
    payment_date = Column(Date, nullable=True)

    # Relationships
    student = relationship("Student", back_populates="fee_payments")

# Alias for standard CamelCase access
FeePayment = Fee_Payment