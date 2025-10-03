import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type Form = z.infer<typeof Schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(Schema),
  });

  const onSubmit = async (v: Form) => {
    console.log("[login] submitting payload:", v);
    try {
      await login(v.email, v.password);
      console.log("[login] success, navigating…");
      nav("/shopping");
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Login failed";
      console.error("[login] error:", e);
      alert(msg);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-sm-10 col-md-6 col-lg-4">
        <h3 className="mb-3">Login</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="vstack gap-3">
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
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            Sign in
          </button>
          <div className="mt-3">
            <small>
              Don’t have an account? <Link to="/signup">Create one</Link>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}
