import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { LeadState } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const createFormSchema = (phoneRequiredMsg: string) => z.object({
  name: z.string().optional(),
  phone: z.string().min(1, phoneRequiredMsg),
  phone2: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  stateId: z.string().optional(),
  channel: z.string().optional(),
  campaign: z.string().optional(),
  assignedTo: z.string().optional(),
  requestType: z.string().optional(),
  unitType: z.string().optional(),
  area: z.string().optional(),
  space: z.string().optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  budget: z.string().optional(),
  location: z.string().optional(),
  paymentType: z.string().optional(),
  downPayment: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export default function AddLeadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const formSchema = createFormSchema(t.phoneRequired);

  const { data: states } = useQuery<LeadState[]>({
    queryKey: ["/api/states"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      phone2: "",
      email: "",
      stateId: "",
      channel: "",
      campaign: "",
      assignedTo: "",
      requestType: "",
      unitType: "",
      area: "",
      space: "",
      bedrooms: undefined,
      bathrooms: undefined,
      budget: "",
      location: "",
      paymentType: "",
      downPayment: "",
      notes: "",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== "" && v !== undefined)
      );
      return apiRequest("POST", "/api/leads", cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t.leadCreatedSuccess });
      navigate("/leads");
    },
    onError: () => {
      toast({ title: t.leadCreatedError, variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    createLeadMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-add-lead-title">
            {t.addNewLeadTitle}
          </h1>
          <p className="text-muted-foreground">{t.addNewLeadSubtitle}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.contactInfo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.name}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.name} {...field} data-testid="input-lead-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.phone} *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.phone}
                          {...field}
                          data-testid="input-lead-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.phone2}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.phone2}
                          {...field}
                          data-testid="input-lead-phone2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.email}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t.email}
                          {...field}
                          data-testid="input-lead-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.leadStatus}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="stateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.status}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-state">
                            <SelectValue placeholder={t.selectState} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {states?.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.channel}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-channel">
                            <SelectValue placeholder={t.selectChannel} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Facebook">{t.facebook}</SelectItem>
                          <SelectItem value="Google">Google</SelectItem>
                          <SelectItem value="Instagram">{t.instagram}</SelectItem>
                          <SelectItem value="Website">{t.website}</SelectItem>
                          <SelectItem value="Referral">{t.referral}</SelectItem>
                          <SelectItem value="Cold Call">{t.other}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="campaign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.campaign}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.campaign}
                          {...field}
                          data-testid="input-lead-campaign"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.assignedTo}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.assignedTo}
                          {...field}
                          data-testid="input-lead-assigned"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.propertyPreferences}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="requestType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.requestType}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-request-type">
                            <SelectValue placeholder={t.selectRequestType} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Buy">{t.buy}</SelectItem>
                          <SelectItem value="Rent">{t.rent}</SelectItem>
                          <SelectItem value="Invest">{t.invest}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.unitType}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-unit-type">
                            <SelectValue placeholder={t.selectUnitType} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Apartment">{t.apartment}</SelectItem>
                          <SelectItem value="Villa">{t.villa}</SelectItem>
                          <SelectItem value="Townhouse">{t.townhouse}</SelectItem>
                          <SelectItem value="Duplex">{t.duplex}</SelectItem>
                          <SelectItem value="Penthouse">{t.penthouse}</SelectItem>
                          <SelectItem value="Studio">{t.studio}</SelectItem>
                          <SelectItem value="Office">{t.commercial}</SelectItem>
                          <SelectItem value="Shop">{t.commercial}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.bedrooms}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-lead-bedrooms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.bathrooms}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-lead-bathrooms"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.paymentDetails}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.area}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.area} {...field} data-testid="input-lead-area" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.location}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.location}
                          {...field}
                          data-testid="input-lead-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.budget}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.budget}
                          {...field}
                          data-testid="input-lead-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.paymentType}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-payment-type">
                            <SelectValue placeholder={t.selectPaymentType} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">{t.cash}</SelectItem>
                          <SelectItem value="Installment">{t.installments}</SelectItem>
                          <SelectItem value="Mortgage">{t.mortgage}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="downPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.downPayment}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.downPayment}
                          {...field}
                          data-testid="input-lead-down-payment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.notes}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={t.additionalNotes}
                        rows={4}
                        {...field}
                        data-testid="textarea-lead-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/leads">
              <Button variant="outline" type="button" data-testid="button-cancel">
                {t.cancel}
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createLeadMutation.isPending}
              data-testid="button-save-lead"
            >
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.save}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
