import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthProvider";
import { useNavigate, Link } from "react-router-dom";

const Schema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "At least 6 characters"),
});
type Form = z.infer<typeof Schema>;

export default function SignupPage() {
  const nav = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = async (v: Form) => {
    try {
      // 1) Create account
      await api.post("/auth/signup", {
        displayName: v.displayName,
        email: v.email,
        password: v.password,
      });
      // 2) Auto-login
      await login(v.email, v.password);
      nav("/shopping");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Signup failed";
      alert(msg);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-sm-10 col-md-6 col-lg-4">
        <h3 className="mb-3">Create account</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="vstack gap-3">
          <div>
            <label className="form-label">Name</label>
            <input className="form-control" {...register("displayName")} />
            {errors.displayName && (
              <div className="text-danger small">
                {errors.displayName.message}
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-control" {...register("email")} />
            {errors.email && (
              <div className="text-danger small">{errors.email.message}</div>
            )}
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              {...register("password")}
            />
            {errors.password && (
              <div className="text-danger small">{errors.password.message}</div>
            )}
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            Create account
          </button>
        </form>
        <div className="mt-3">
          <small>
            Already have an account? <Link to="/login">Sign in</Link>
          </small>
        </div>
      </div>
    </div>
  );
}
