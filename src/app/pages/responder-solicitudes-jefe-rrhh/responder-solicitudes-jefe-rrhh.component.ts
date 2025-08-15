import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-responder-solicitudes-jefe-rrhh',
  imports: [CommonModule, FormsModule, NgbModule],
  templateUrl: './responder-solicitudes-jefe-rrhh.component.html',
  styleUrl: './responder-solicitudes-jefe-rrhh.component.css'
})
export class ResponderSolicitudesJefeRrhhComponent implements OnInit, OnDestroy {
  solicitudes: any[] = [];
  apiUrl = `${environment.apiUrl}/aprobarSolicitudesRRHH`;
  apiUrl2= `${environment.apiUrl}/rechazarSolicitudesRRHH`;

  empleado = {
    fecha: '',
    tipoSolicitud: '',
    nombre: '',
    estadoSolicitud: ''
  };
     
  modalTitle: string = '';
  modalMessage: string = '';
  @ViewChild('modalContent') modalContent: any;

  private notificationPermission: boolean = false;

  constructor(private http: HttpClient, private modalService: NgbModal) {}

  fecha: string = new Date().toLocaleString('es-HN', { 
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).split('/').reverse().join('-');

  solicitudSeleccionada: any = null;
  mot_rechazo: string = '';
  intervalId: any;

  async solicitarPermisoNotificaciones() {
    if (!('Notification' in window)) return;
  
    try {
      const permiso = await Notification.requestPermission();
      this.notificationPermission = permiso === 'granted';
    } catch (error) {}
  }
  
  mostrarNotificacion(mensaje: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
    try {
      const notification = new Notification('SISTEMA DE PERMISOS SEDH', {
        body: mensaje.toUpperCase(),
        icon: 'LogoSedhEscudo.png',
        tag: 'nueva-solicitud',
        requireInteraction: true,
        silent: false
      });
  
      notification.onclick = () => {
        window.focus();
        window.location.href = window.location.href;
        notification.close();
      };
    } catch (error) {}
  }

  ngOnInit() {
    this.solicitarPermisoNotificaciones();
    this.obtenerTodasLasSolicitudes();
    this.iniciarActualizacionAutomatica();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  obtenerTodasLasSolicitudes() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.solicitudes = data;
        if (data.length > 0) {
          this.mostrarNotificacion(`Ud tiene ${data.length} ${data.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de revisión`);
        }
      },
      error: (error) => {
        console.error('Error al obtener solicitudes:', error);
      }
    });
  }

  iniciarActualizacionAutomatica() {
    this.intervalId = setInterval(() => {
      this.obtenerTodasLasSolicitudes();
    }, 10000);
  }

  openModal(solicitud: any) {
    this.solicitudSeleccionada = solicitud;
    this.modalTitle = solicitud.nom_tipo_solicitud;
    const modalRef = this.modalService.open(this.modalContent, {
      centered: true,
      backdrop: 'static',
      size: 'lg'
    });
  }

  actualizarSolicitud(id: number, estado: string) {
    const token = localStorage.getItem('token');
    let userEmail = '';

    if (token) {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      userEmail = tokenData.sub;
    }
    
    const payload = {
      id_permiso: this.solicitudSeleccionada.id_permiso,
      tipo_permiso: this.solicitudSeleccionada.nom_tipo_solicitud,
      seg_aprobacion: userEmail,
      mot_rechazo: estado === 'RECHAZADO' ? this.mot_rechazo : null,
      hor_rechazadas: estado === 'RECHAZADO' && 
                     this.solicitudSeleccionada.nom_tipo_solicitud === 'PERMISO PERSONAL' ? 
                     this.solicitudSeleccionada.hor_solicitadas : '00:00'
    };
    console.log('Payload:', payload);
    const url = estado === 'RECHAZADO' ? this.apiUrl2 : this.apiUrl;
    
    this.http.put(url, payload).subscribe({
      next: (response) => {
        this.obtenerTodasLasSolicitudes();
        this.modalService.dismissAll();
        this.limpiarFormulario();
      },
      error: (error) => {
        console.error('Error:', error);
      }
    });
  }
  
  aprobarSolicitud() {
    this.actualizarSolicitud(this.solicitudSeleccionada.id, 'APROBADO');  
  }

  rechazarSolicitud() {
    if (!this.mot_rechazo.trim()) {
      alert('Debe ingresar el MOTIVO DE RECHAZO para no aprobar la solicitud.');
      return;
    }
    this.actualizarSolicitud(this.solicitudSeleccionada.id, 'RECHAZADO');
  }

  limpiarFormulario() {
    this.mot_rechazo = '';
  }
}
