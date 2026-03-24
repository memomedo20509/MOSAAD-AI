import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Phone, Mail, Building2, MapPin, User, Paperclip } from "lucide-react";
import type { Client } from "@shared/schema";
import { useLanguage } from "@/lib/i18n";
import { DocumentsTab } from "@/components/documents-tab";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { t } = useLanguage();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch =
      !searchQuery ||
      client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-clients-title">
          {t.clientsTitle}
        </h1>
        <p className="text-muted-foreground">{t.clientsSubtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t.searchClients}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rtl:pl-3 rtl:pr-9"
            data-testid="input-search-clients"
          />
        </div>
        <div className="text-sm text-muted-foreground" data-testid="text-clients-count">
          {filteredClients?.length || 0} {t.clients}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients && filteredClients.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => setSelectedClient(client)}
              data-testid={`card-client-${client.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" data-testid={`text-client-name-${client.id}`}>
                      {client.name || t.noName}
                    </h3>

                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {client.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.project && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="truncate">{client.project}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <Badge variant="secondary">
                        {client.unitsCount || 0} unit{(client.unitsCount || 0) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">{t.noClientsFound}</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {t.noClientsYet}
            </p>
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle data-testid="text-client-detail-name">
              {selectedClient?.name || t.noName}
            </SheetTitle>
          </SheetHeader>

          {selectedClient && (
            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info" data-testid="tab-client-info">
                  <User className="h-4 w-4 mr-1" />
                  {t.contactInfo}
                </TabsTrigger>
                <TabsTrigger value="documents" data-testid="tab-client-documents">
                  <Paperclip className="h-4 w-4 mr-1" />
                  {t.documents}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.contactInfo}</h4>
                  <div className="space-y-2">
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.phone}</span>
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.email}</span>
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.propertyPreferences}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t.projects}</p>
                      <p className="font-medium">{selectedClient.project || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t.units}</p>
                      <p className="font-medium">{selectedClient.unitsCount || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t.actions}</h4>
                  <div className="space-y-2">
                    {selectedClient.phone && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`tel:${selectedClient.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Call {selectedClient.phone}
                        </a>
                      </Button>
                    )}
                    {selectedClient.email && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`mailto:${selectedClient.email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email {selectedClient.email}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <DocumentsTab entityType="client" entityId={selectedClient.id} />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
