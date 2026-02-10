import MessagePage from "@/components/auth/message-page";

export default function CheckEmailPage() {
  return (
    <MessagePage
      type="success"
      title="Check Your Email"
      description="We've sent you a verification link. Please check your email to verify your account."
    />
  );
}
