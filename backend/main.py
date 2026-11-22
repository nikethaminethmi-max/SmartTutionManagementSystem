from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, get_db
import models
import schemas
import auth

# ── Phase 2: Role-based API routers ─────────────────────────────────────────
from routers import admin as admin_router
from routers import teacher as teacher_router
from routers import student as student_router
from routers import parent as parent_router  # Phase 5

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Tuition Management System API",
    description="Backend API for the TMS — supports Admin, Teacher, and Student roles.",
    version="2.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React's Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────────────
app.include_router(admin_router.router)    # /admin/*
app.include_router(teacher_router.router)  # /teacher/*
app.include_router(student_router.router)  # /student/*
app.include_router(parent_router.router)   # /parent/*  (Phase 5)


# ── Public routes (existing — do not modify) ─────────────────────────────────

@app.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Check if email already exists
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password and save the User
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email, 
        password_hash=hashed_password, 
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Create the specific profile based on the role
    if user.role == "student":
        profile = models.Student(user_id=new_user.id, full_name=user.full_name)
        db.add(profile)
    elif user.role == "teacher":
        profile = models.Teacher(user_id=new_user.id, full_name=user.full_name)
        db.add(profile)
    elif user.role == 'parent':
        profile = models.Parent(user_id=new_user.id, full_name=user.full_name)
        db.add(profile)
    
    db.commit()
    return {"message": "User created successfully"}


@app.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. Find the user in the database
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    
    # 2. Verify user exists and password is correct
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # 3. Create JWT Token with user details
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    
    # 4. Send token back to React
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}
@app.get("/student/{student_id}/safebox")
def calculate_risk_status(student_id: int, db: Session = Depends(get_db)):
    # Calculate Attendance Percentage
    total_classes = db.query(models.Attendance).filter(models.Attendance.student_id == student_id).count()
    present_classes = db.query(models.Attendance).filter(
        models.Attendance.student_id == student_id, 
        models.Attendance.status == "Present"
    ).count()
    attendance_pct = (present_classes / total_classes * 100) if total_classes > 0 else 100

    # Calculate Average Term Marks
    marks_records = db.query(models.Term_Test_Mark).filter(models.Term_Test_Mark.student_id == student_id).all()
    avg_marks = sum([m.marks for m in marks_records]) / len(marks_records) if marks_records else 100

    # Apply Predefined Rules
    if attendance_pct < 60 or avg_marks < 40:
        status = "At Risk"
        color = "danger" # Maps to Bootstrap Red
        # Note: In production, trigger Twilio/SendGrid email to linked parent here
    elif 60 <= attendance_pct <= 79 or 40 <= avg_marks <= 49:
        status = "Warning"
        color = "warning" # Maps to Bootstrap Yellow
    else:
        status = "Safe"
        color = "success" # Maps to Bootstrap Green
        
    return {
        "attendance": round(attendance_pct, 1), 
        "average_marks": round(avg_marks, 1), 
        "risk_status": status, 
        "color": color
    }

import random

@app.get("/classes/{class_id}/quiz/generate")
def generate_randomized_quiz(class_id: int, db: Session = Depends(get_db)):
    # Fetch all available questions for this specific class/subject
    all_questions = db.query(models.Question).filter(models.Question.class_id == class_id).all()
    
    # Shuffle and select exactly 10 questions per student attempt
    if len(all_questions) >= 10:
        selected_questions = random.sample(all_questions, 10)
    else:
        # Fallback if the bank has less than 10 questions
        selected_questions = all_questions 
        
    return {"quiz_questions": selected_questions}